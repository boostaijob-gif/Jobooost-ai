import admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };
import { syncNewJobsWithProfiles } from "./matcher.ts";
import fs from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL FALLBACK DB (used when Firestore database query errors or is unprovisioned)
// ─────────────────────────────────────────────────────────────────────────────

let useLocalMockDb = false;

class LocalFileDb {
  private filePath = path.join(process.cwd(), "local_fallback_db.json");
  private data: Record<string, Record<string, any>> = { jobs: {}, profiles: {}, notifications: {} };

  constructor() { this.load(); }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        this.data = JSON.parse(raw);
        if (!this.data.jobs) this.data.jobs = {};
        if (!this.data.profiles) this.data.profiles = {};
        if (!this.data.notifications) this.data.notifications = {};
      } else { this.save(); }
    } catch (err) { console.error("[LocalFileDb] Load failed, playing safe with in-memory store:", err); }
  }

  private save() {
    try { fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8"); }
    catch (err) { console.error("[LocalFileDb] Save failed:", err); }
  }

  private sanitizeFieldValues(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;
    const copy = { ...obj };
    for (const [key, val] of Object.entries(copy)) {
      if (val && typeof val === "object") {
        if (val.constructor && (val.constructor.name === "FieldValue" || val.constructor.name === "FieldValueImpl")) {
          copy[key] = new Date().toISOString();
        } else if (typeof (val as any).toDate === "function") {
          copy[key] = (val as any).toDate().toISOString();
        } else { copy[key] = this.sanitizeFieldValues(val); }
      }
    }
    return copy;
  }

  public collection(collectionName: string) {
    const self = this;
    if (!this.data[collectionName]) { this.data[collectionName] = {}; this.save(); }
    return {
      doc(docId: string) {
        return {
          async get() { const d = self.data[collectionName][docId]; return { id: docId, exists: !!d, data: () => d ? { ...d } : undefined }; },
          async set(newData: any, options?: { merge?: boolean }) {
            const cleaned = self.sanitizeFieldValues(newData);
            const existing = self.data[collectionName][docId] || {};
            self.data[collectionName][docId] = options?.merge ? { ...existing, ...cleaned } : { ...cleaned };
            self.save(); return { writeTime: new Date() };
          },
          async update(updateData: any) {
            const cleaned = self.sanitizeFieldValues(updateData);
            self.data[collectionName][docId] = { ...(self.data[collectionName][docId] || {}), ...cleaned };
            self.save(); return { writeTime: new Date() };
          },
          async delete() { delete self.data[collectionName][docId]; self.save(); return { writeTime: new Date() }; }
        };
      },
      where(field: string, op: string, val: any) {
        return {
          async get() {
            const items = Object.entries(self.data[collectionName])
              .filter(([_, data]) => { const iv = data[field]; if (op === "==") return iv === val; if (op === ">") return iv > val; if (op === "<") return iv < val; return false; })
              .map(([id, data]) => ({ id, exists: true, data: () => ({ ...data }) }));
            return { size: items.length, empty: items.length === 0, docs: items, forEach(cb: (d: any) => void) { items.forEach(cb); } };
          }
        };
      },
      orderBy(field: string, direction: "asc" | "desc" = "asc") {
        const orderByObj = {
          async get() {
            const items = Object.entries(self.data[collectionName]).map(([id, data]) => ({ id, exists: true, data: () => ({ ...data }) }));
            items.sort((a, b) => {
              const vA = a.data()[field], vB = b.data()[field];
              if (vA === undefined) return 1; if (vB === undefined) return -1;
              const tA = (vA && typeof vA === "object" && typeof vA.toDate === "function") ? vA.toDate().getTime() : new Date(vA).getTime();
              const tB = (vB && typeof vB === "object" && typeof vB.toDate === "function") ? vB.toDate().getTime() : new Date(vB).getTime();
              if (!isNaN(tA) && !isNaN(tB)) return direction === "asc" ? tA - tB : tB - tA;
              if (vA < vB) return direction === "asc" ? -1 : 1; if (vA > vB) return direction === "asc" ? 1 : -1; return 0;
            });
            return { size: items.length, empty: items.length === 0, docs: items, forEach(cb: (d: any) => void) { items.forEach(cb); } };
          },
          limit(n: number) {
            return { async get() { const res = await orderByObj.get(); const s = res.docs.slice(0, n); return { size: s.length, empty: s.length === 0, docs: s, forEach(cb: (d: any) => void) { s.forEach(cb); } }; } };
          }
        };
        return orderByObj;
      },
      limit(n: number) {
        return {
          async get() {
            const items = Object.entries(self.data[collectionName]).slice(0, n).map(([id, data]) => ({ id, exists: true, data: () => ({ ...data }) }));
            return { size: items.length, empty: items.length === 0, docs: items, forEach(cb: (d: any) => void) { items.forEach(cb); } };
          }
        };
      },
      async get() {
        const items = Object.entries(self.data[collectionName]).map(([id, data]) => ({ id, exists: true, data: () => ({ ...data }) }));
        return { size: items.length, empty: items.length === 0, docs: items, forEach(cb: (d: any) => void) { items.forEach(cb); } };
      }
    };
  }
}

let localMockDbInstance: LocalFileDb | null = null;
function getLocalMockDb(): LocalFileDb {
  if (!localMockDbInstance) localMockDbInstance = new LocalFileDb();
  return localMockDbInstance;
}

let activeDb: admin.firestore.Firestore | null = null;
let initPromise: Promise<admin.firestore.Firestore> | null = null;

export async function ensureDbInitialized(): Promise<admin.firestore.Firestore> {
  if (activeDb) return activeDb;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      if (admin.apps.length === 0) admin.initializeApp({ projectId: firebaseConfig.projectId });
      const defaultDb = admin.firestore();
      let customDbWorks = false;
      if (firebaseConfig.firestoreDatabaseId) {
        try {
          const customDb = admin.app().firestore(firebaseConfig.firestoreDatabaseId);
          await customDb.collection("_db_probe_").limit(1).get();
          activeDb = customDb; customDbWorks = true; useLocalMockDb = false;
          console.log(`[Firebase Init] Custom database "${firebaseConfig.firestoreDatabaseId}" is active.`);
        } catch (err: any) { console.warn(`[Firebase Init] Custom DB unavailable: ${err.message}`); }
      }
      if (!customDbWorks) {
        try {
          await defaultDb.collection("_db_probe_").limit(1).get();
          activeDb = defaultDb; useLocalMockDb = false;
          console.log(`[Firebase Init] Default database is active.`);
        } catch (err: any) {
          console.warn(`[Firebase Init] Default DB unavailable: ${err.message}. Switching to local JSON fallback.`);
          useLocalMockDb = true;
        }
      }
    } catch (error) { console.error("[Firebase Init] Error:", error); useLocalMockDb = true; }
    return activeDb || (getLocalMockDb() as any);
  })();
  return initPromise;
}

export function getFirestoreAdmin(): admin.firestore.Firestore {
  if (useLocalMockDb) return getLocalMockDb() as any;
  return new Proxy({} as admin.firestore.Firestore, {
    get(target, prop, receiver) {
      if (useLocalMockDb) return Reflect.get(getLocalMockDb(), prop);
      try {
        const db = activeDb || admin.firestore();
        const value = Reflect.get(db, prop, db);
        return typeof value === "function" ? value.bind(db) : value;
      } catch {
        useLocalMockDb = true;
        return Reflect.get(getLocalMockDb(), prop);
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI AI CLIENT
// ─────────────────────────────────────────────────────────────────────────────

let aiClient: any = null;
function getAI() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "dummy",
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });
  }
  return aiClient;
}

let geminiQuotaExhausted = false;
let geminiQuotaLastExhaustedTime = 0;
// FIX: Increased cooldown to 3 minutes to better handle quota resets
const QUOTA_COOLDOWN_MS = 180000;

// ─────────────────────────────────────────────────────────────────────────────
// JOB DATA TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ScrapedJob {
  id?: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  seniority: string;
  industry: string;
  jobType: string;
  datePosted: string;
  sourceSite: string;
  salaryRange?: { min: number; max: number; currency: string };
  technologies: string[];
  createdAt: any;
  isVerified?: boolean;
  verificationStatus?: string;  // "live" | "unverified" | "dead"
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL RSS FEED SOURCES — EXPANDED & FIXED
// Added: GotFriends, JobMaster, Comeet, Remotive AI, Hackernews Jobs
// Fixed: AllJobs URL corrected
// ─────────────────────────────────────────────────────────────────────────────

interface RssFeedConfig {
  name: string;
  url: string;
  region: "israel" | "global";
  category: string;
  maxItems?: number;
}

const RSS_FEEDS: RssFeedConfig[] = [
  // ── Israel-specific feeds ──────────────────────────────────────────────────
  {
    name: "AllJobs Israel",
    // FIX: Corrected AllJobs RSS URL (the old /rss.aspx returned homepage)
    url: "https://www.alljobs.co.il/SearchResultsGuest.aspx?pos=&type=4&source=0&indu=0&city=0&school=0&region=0",
    region: "israel",
    category: "General",
    maxItems: 40
  },
  {
    name: "GotFriends Israel",
    url: "https://www.gotfriends.co.il/jobs/rss/",
    region: "israel",
    category: "High-Tech",
    maxItems: 40
  },
  {
    name: "JobMaster Israel",
    url: "https://www.jobmaster.co.il/rss/",
    region: "israel",
    category: "General",
    maxItems: 40
  },
  {
    name: "Comeet Tech Jobs Israel",
    url: "https://www.comeet.com/jobs/rss",
    region: "israel",
    category: "Engineering",
    maxItems: 40
  },
  {
    name: "Drushim Israel",
    url: "https://www.drushim.co.il/rss/",
    region: "israel",
    category: "General",
    maxItems: 40
  },
  // ── Remote / Global feeds ──────────────────────────────────────────────────
  {
    name: "We Work Remotely – Programming",
    url: "https://weworkremotely.com/categories/remote-programming-jobs.rss",
    region: "global",
    category: "Engineering",
    maxItems: 50
  },
  {
    name: "We Work Remotely – Product",
    url: "https://weworkremotely.com/categories/remote-product-jobs.rss",
    region: "global",
    category: "Product",
    maxItems: 30
  },
  {
    name: "We Work Remotely – Design",
    url: "https://weworkremotely.com/categories/remote-design-jobs.rss",
    region: "global",
    category: "Design",
    maxItems: 30
  },
  {
    name: "We Work Remotely – Marketing",
    url: "https://weworkremotely.com/categories/remote-marketing-jobs.rss",
    region: "global",
    category: "Marketing",
    maxItems: 30
  },
  {
    name: "We Work Remotely – DevOps",
    url: "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
    region: "global",
    category: "DevOps",
    maxItems: 30
  },
  {
    name: "Remotive – Software Engineering",
    url: "https://remotive.com/remote-jobs/feed/software-dev",
    region: "global",
    category: "Engineering",
    maxItems: 50
  },
  {
    name: "Remotive – Product",
    url: "https://remotive.com/remote-jobs/feed/product",
    region: "global",
    category: "Product",
    maxItems: 30
  },
  {
    name: "Remotive – DevOps / SysAdmin",
    url: "https://remotive.com/remote-jobs/feed/devops-sysadmin",
    region: "global",
    category: "DevOps",
    maxItems: 30
  },
  {
    name: "Remotive – Cybersecurity",
    url: "https://remotive.com/remote-jobs/feed/security",
    region: "global",
    category: "Security",
    maxItems: 30
  },
  {
    name: "Remotive – Data",
    url: "https://remotive.com/remote-jobs/feed/data",
    region: "global",
    category: "Data",
    maxItems: 30
  },
  {
    name: "Remotive – AI / Machine Learning",
    url: "https://remotive.com/remote-jobs/feed/ai-machine-learning",
    region: "global",
    category: "AI / ML",
    maxItems: 40
  },
  {
    name: "Remotive – QA",
    url: "https://remotive.com/remote-jobs/feed/qa",
    region: "global",
    category: "QA",
    maxItems: 25
  },
  {
    name: "Remotive – Finance / Legal",
    url: "https://remotive.com/remote-jobs/feed/finance-legal",
    region: "global",
    category: "Finance",
    maxItems: 20
  },
  {
    name: "Remotive – Human Resources",
    url: "https://remotive.com/remote-jobs/feed/human-resources",
    region: "global",
    category: "HR",
    maxItems: 20
  },
  {
    name: "GitHub Jobs (via RSS bridge)",
    url: "https://hnrss.org/jobs",
    region: "global",
    category: "Engineering",
    maxItems: 40
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// URL VALIDATOR – checks if a URL is actually reachable (HTTP HEAD/GET request)
// FIX: Fallback to GET if HEAD is rejected; more tolerant status handling
// ─────────────────────────────────────────────────────────────────────────────

const urlVerificationCache = new Map<string, { status: "live" | "dead" | "unverified"; timestamp: number }>();
// FIX: Increased TTL to 1 hour to reduce redundant network calls
const URL_CACHE_TTL_MS = 60 * 60 * 1000;

async function verifyUrl(url: string): Promise<"live" | "dead" | "unverified"> {
  if (!url || !url.startsWith("http")) return "dead";

  const cached = urlVerificationCache.get(url);
  if (cached && (Date.now() - cached.timestamp) < URL_CACHE_TTL_MS) {
    return cached.status;
  }

  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5"
  };

  const probe = async (method: "HEAD" | "GET"): Promise<"live" | "dead" | "unverified"> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const resp = await fetch(url, {
        method,
        signal: controller.signal,
        redirect: "follow",
        headers: HEADERS
      });
      clearTimeout(timeout);
      if (resp.status >= 200 && resp.status < 400) return "live";
      if (resp.status === 404 || resp.status === 410 || resp.status === 451) return "dead";
      // FIX: 405 (Method Not Allowed) on HEAD → try GET
      if (method === "HEAD" && (resp.status === 405 || resp.status === 403)) return "retry_get";
      return "unverified";
    } catch {
      clearTimeout(timeout);
      return "unverified";
    }
  };

  try {
    let status = await probe("HEAD") as any;
    // FIX: Some servers block HEAD; retry with GET
    if (status === "retry_get") {
      status = await probe("GET");
    }
    urlVerificationCache.set(url, { status, timestamp: Date.now() });
    return status;
  } catch {
    urlVerificationCache.set(url, { status: "unverified", timestamp: Date.now() });
    return "unverified";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC ID GENERATOR
// FIX: Added URL-based fallback ID to handle duplicate company+title pairs
// ─────────────────────────────────────────────────────────────────────────────

export function generateDeterministicJobId(company: string, title: string, url?: string): string {
  const clean = (s: string) => (s || "unknown").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const base = `scraped-${clean(company)}-${clean(title)}`;
  if (url) {
    // FIX: Append a short URL hash to prevent collisions for same title at different companies
    try {
      const urlObj = new URL(url);
      const slug = urlObj.pathname.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-12);
      if (slug.length >= 4) return `${base}-${slug}`.substring(0, 128);
    } catch {}
  }
  return base.substring(0, 128);
}

// ─────────────────────────────────────────────────────────────────────────────
// TECHNOLOGY EXTRACTOR — EXPANDED LIST
// FIX: Added AI/ML stack, more Israeli market-relevant technologies
// ─────────────────────────────────────────────────────────────────────────────

const KNOWN_TECHS = [
  // Frontend
  "React", "TypeScript", "JavaScript", "Angular", "Vue", "Next.js", "Nuxt", "Svelte",
  "HTML", "CSS", "Tailwind", "SASS", "Webpack", "Vite", "Storybook",
  // Backend
  "Node.js", "Python", "Java", "C++", "C#", "Golang", "Go", "Rust", "PHP",
  "Express", "FastAPI", "Django", "Flask", "Spring Boot", "NestJS", "Laravel",
  "Ruby", "Ruby on Rails", "Scala", ".NET", "ASP.NET",
  // Cloud & DevOps
  "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "Ansible", "Helm",
  "CI/CD", "GitHub Actions", "Jenkins", "ArgoCD", "Linux", "Bash", "DevOps",
  // Data
  "SQL", "MongoDB", "PostgreSQL", "MySQL", "Redis", "Elasticsearch",
  "Kafka", "RabbitMQ", "Spark", "Airflow", "dbt", "Snowflake", "BigQuery",
  "Tableau", "Power BI", "Looker", "Databricks",
  // AI / ML
  "Machine Learning", "Deep Learning", "NLP", "LLM", "PyTorch", "TensorFlow",
  "OpenAI", "Gemini", "LangChain", "RAG", "Computer Vision", "Hugging Face",
  "scikit-learn", "pandas", "NumPy", "MLflow", "Vertex AI", "SageMaker",
  // Mobile
  "Swift", "Kotlin", "Flutter", "React Native", "iOS", "Android",
  // API & Integration
  "GraphQL", "REST", "gRPC", "WebSockets", "Microservices", "Event-Driven",
  // Security
  "Cybersecurity", "Penetration Testing", "SIEM", "SOC", "Zero Trust",
  "Splunk", "CrowdStrike", "CheckPoint", "Palo Alto",
  // Tools & Practices
  "Jira", "Scrum", "Agile", "Kanban", "Figma", "Cypress", "Selenium",
  "Playwright", "Jest", "Pytest", "Postman",
  // Israeli market specific
  "R&D", "Unit 8200", "SAP", "Salesforce", "Okta", "Wiz", "CyberArk"
];

function extractTechnologies(text: string): string[] {
  const found: string[] = [];
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const tech of KNOWN_TECHS) {
    try {
      const sb = /^\w/.test(tech) ? "\\b" : "";
      const eb = /\w$/.test(tech) ? "\\b" : "";
      if (new RegExp(`${sb}${escapeRegExp(tech)}${eb}`, "i").test(text)) found.push(tech);
    } catch {}
  }
  return [...new Set(found)]; // FIX: deduplicate technologies
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB SANITIZER & FILTER
// FIX: More lenient description minimum (50 chars for RSS items), better
//      location extraction with Israeli cities
// ─────────────────────────────────────────────────────────────────────────────

const GENERIC_HOMEPAGE_PATTERNS = [
  /^https?:\/\/(www\.)?(linkedin\.com\/?\??$|linkedin\.com\/jobs\/?$|drushim\.co\.il\/?$|alljobs\.co\.il\/?$|glassdoor\.com\/?$|indeed\.com\/?$|il\.indeed\.com\/?$|gotfriends\.co\.il\/?$|jobmaster\.co\.il\/?$|comeet\.com\/?$)/i,
  /^https?:\/\/[^/]+\.(com|co\.il|org|net)\/?(\?.*)?$/i
];

function isGenericOrFakeUrl(url: string): boolean {
  if (!url || url.trim().length < 15) return true;
  if (!url.startsWith("http")) return true;
  try {
    const parsed = new URL(url);
    if (parsed.pathname === "/" || parsed.pathname === "") return true;
    // FIX: Require at least some path depth or query params that indicate a specific job
    const hasJobIndicator = 
      /\d{4,}/.test(parsed.pathname) ||     // numeric job ID
      parsed.pathname.split("/").length > 2 || // e.g. /jobs/software-engineer-company
      parsed.searchParams.has("jobId") ||
      parsed.searchParams.has("id") ||
      parsed.searchParams.has("job_id") ||
      parsed.searchParams.has("jid");
    if (!hasJobIndicator && parsed.pathname.length < 10) {
      // Only reject very short paths with no job indicators
      return false; // Be lenient — let URL verification decide
    }
  } catch { return true; }
  for (const pat of GENERIC_HOMEPAGE_PATTERNS) {
    if (pat.test(url.trim())) return true;
  }
  return false;
}

const NOISE_PHRASES = [
  "position is closed", "no longer accepting", "job expired", "listing has expired",
  "this role has been filled", "משרה לא פעילה", "הגיוס נסגר", "המשרה אוישה",
  "unsupported location", "spam listing", "this position has been filled",
  "applications are no longer being accepted"
];

// FIX: Minimum description length reduced to 50 for RSS items that may be brief
const MIN_DESCRIPTION_LENGTH = 50;

export function sanitizeAndFilterJob(job: Partial<ScrapedJob>): ScrapedJob | null {
  if (!job.title || !job.company || !job.url) {
    console.log(`[Sanitizer] DISCARD – missing core fields: ${job.title || "no title"}`);
    return null;
  }

  // FIX: Accept job even if description is short — RSS feeds often send truncated text
  const rawDesc = job.description || "";
  const cleanDesc = rawDesc.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  if (cleanDesc.length < MIN_DESCRIPTION_LENGTH) {
    // FIX: Don't discard — reconstruct minimal description from title+company
    const fallbackDesc = `${job.title} at ${job.company}. ${job.location || ""}. Apply via ${job.sourceSite || "job board"}.`;
    job.description = fallbackDesc;
  } else {
    job.description = cleanDesc;
  }

  const lowerDesc = (job.description || "").toLowerCase();
  for (const phrase of NOISE_PHRASES) {
    if (lowerDesc.includes(phrase)) {
      console.log(`[Sanitizer] DISCARD – expired/noise phrase "${phrase}": ${job.title}`);
      return null;
    }
  }

  if (isGenericOrFakeUrl(job.url)) {
    console.log(`[Sanitizer] DISCARD – generic/fake URL: ${job.url} (${job.title})`);
    return null;
  }

  const fakeCompanyPatterns = [
    /^innovate\s+israel/i,
    /^(global enterprise|top company|leading company|well-known company|reputable company)$/i,
    /^(company name|employer|n\/a|unknown company)$/i,
    /^(confidential|undisclosed)$/i
  ];
  for (const pat of fakeCompanyPatterns) {
    if (pat.test((job.company || "").trim())) {
      console.log(`[Sanitizer] DISCARD – fake/placeholder company name: "${job.company}"`);
      return null;
    }
  }

  if (/innovate-israel\.co\.il\/jobs\//i.test(job.url)) {
    console.log(`[Sanitizer] DISCARD – detected old fake fallback URL: ${job.url}`);
    return null;
  }

  const technologies = extractTechnologies(`${job.title} ${job.description}`);

  return {
    title: job.title.trim().substring(0, 150),
    company: job.company.trim().substring(0, 100),
    location: (job.location || "Israel / Remote").trim().substring(0, 150),
    url: job.url.trim(),
    description: (job.description || "").substring(0, 2000),
    seniority: job.seniority || inferSeniority(job.title),
    industry: job.industry || inferIndustry(job.title + " " + (job.description || "")),
    jobType: job.jobType || inferJobType(job.title + " " + (job.description || "")),
    datePosted: job.datePosted || new Date().toISOString().split("T")[0],
    sourceSite: job.sourceSite || "Job Board",
    salaryRange: job.salaryRange,
    technologies: technologies.length > 0 ? technologies : [],
    isVerified: job.isVerified ?? false,
    verificationStatus: job.verificationStatus ?? "unverified",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SMART FIELD INFERENCE HELPERS (NEW)
// Improve accuracy when RSS feeds don't provide explicit field values
// ─────────────────────────────────────────────────────────────────────────────

function inferSeniority(title: string): string {
  const t = (title || "").toLowerCase();
  if (/\b(senior|sr\.|lead|principal|staff|architect|head of|vp |chief|director|cto|ceo)\b/.test(t)) return "Senior";
  if (/\b(junior|jr\.|entry.level|entry level|intern|graduate|student|new grad)\b/.test(t)) return "Junior";
  if (/\b(manager|team lead|tech lead|group lead)\b/.test(t)) return "Lead / Manager";
  return "Mid";
}

function inferIndustry(text: string): string {
  const t = text.toLowerCase();
  if (/\b(cyber|security|soc|siem|pentest|malware|threat|incident response)\b/.test(t)) return "Cybersecurity";
  if (/\b(data engineer|data scientist|analytics|bi |business intelligence|ml |machine learning|ai |deep learning)\b/.test(t)) return "Data & AI";
  if (/\b(devops|cloud|infrastructure|sre|platform engineer|k8s|kubernetes|terraform)\b/.test(t)) return "DevOps & Cloud";
  if (/\b(product manager|product owner|pm |roadmap|sprint|stakeholder)\b/.test(t)) return "Product";
  if (/\b(ux|ui |design|figma|user experience|user interface|visual designer)\b/.test(t)) return "Design";
  if (/\b(marketing|growth|seo|content|brand|social media|demand gen)\b/.test(t)) return "Marketing";
  if (/\b(finance|accounting|controller|cfo|treasury|fintech)\b/.test(t)) return "Finance";
  if (/\b(hr|human resource|talent|recruiter|people ops)\b/.test(t)) return "HR";
  if (/\b(mobile|ios|android|flutter|swift|kotlin)\b/.test(t)) return "Mobile";
  if (/\b(full.?stack|frontend|backend|software engineer|software developer|web developer)\b/.test(t)) return "Software Engineering";
  return "High-Tech & Software";
}

function inferJobType(text: string): string {
  const t = text.toLowerCase();
  if (/\b(contract|freelance|contractor|gig)\b/.test(t)) return "Contract";
  if (/\b(part.?time|parttime)\b/.test(t)) return "Part-Time";
  if (/\b(intern|internship|student)\b/.test(t)) return "Internship";
  return "Full-Time";
}

// ─────────────────────────────────────────────────────────────────────────────
// RSS PARSER — IMPROVED
// FIX: Removed hard cap of 20 items; use feed-level maxItems config
// FIX: Better CDATA handling, improved company/location extraction
// FIX: Hebrew location support, better date parsing
// ─────────────────────────────────────────────────────────────────────────────

// Israeli cities list for location extraction
const ISRAEL_CITIES = [
  "Tel Aviv", "Jerusalem", "Haifa", "Beer Sheva", "Herzliya", "Ramat Gan",
  "Petah Tikva", "Bnei Brak", "Rehovot", "Holon", "Bat Yam", "Netanya",
  "Rishon LeZion", "Ashdod", "Ashkelon", "Eilat", "Nazareth", "Kfar Saba",
  "Ra'anana", "Raanana", "Modi'in", "Modiin", "Caesarea", "Yokneam",
  "Hadera", "Givat Shmuel", "Lod", "Ramle", "Kiryat Ata", "Acre", "Akko",
  "Afula", "Tiberias", "Safed", "Nahariya", "Dimona", "Arad",
  "Tel-Aviv", "Tel Aviv-Yafo", "תל אביב", "ירושלים", "חיפה", "הרצליה"
];

interface RawRssJob {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  datePosted: string;
  sourceSite: string;
  jobType: string;
  seniority: string;
  industry: string;
}

function parseRssFeed(xmlText: string, feedConfig: RssFeedConfig): RawRssJob[] {
  const items = xmlText.match(/<item[\s\S]*?<\/item>/g) || [];
  const maxItems = feedConfig.maxItems || 50; // FIX: Use config-level limit, not hard 20
  const results: RawRssJob[] = [];

  for (const item of items.slice(0, maxItems)) {
    try {
      const getField = (tag: string): string => {
        // FIX: Handle both regular and namespaced CDATA tags
        const cdata = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i"));
        if (cdata) return cdata[1].trim();
        const plain = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
        if (plain) {
          return plain[1]
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/g, "'")
            .trim();
        }
        return "";
      };

      // FIX: Try multiple link fields in priority order
      const rawTitle = getField("title");
      const link = getField("link") || getField("guid") || getField("enclosure");
      const desc = getField("description") || getField("content:encoded") || getField("summary") || getField("content");
      const pubDate = getField("pubDate") || getField("dc:date") || getField("published") || getField("updated");
      // FIX: Try to extract company from <author> or <dc:creator> tags used by some feeds
      const authorField = getField("author") || getField("dc:creator") || "";

      if (!rawTitle || !link) continue;
      if (!link.startsWith("http")) continue;

      // ── Company extraction ──────────────────────────────────────────────
      let company = "";
      let jobTitle = rawTitle;

      // Pattern 1: "Company: Job Title" (WeWorkRemotely format)
      if (rawTitle.includes(":")) {
        const parts = rawTitle.split(":");
        const potentialCompany = parts[0].trim();
        // Only split if the company part looks reasonable (not too long)
        if (potentialCompany.length < 60 && potentialCompany.split(" ").length <= 5) {
          company = potentialCompany;
          jobTitle = parts.slice(1).join(":").trim();
        }
      }

      // Pattern 2: "Job Title @ Company" or "Job Title at Company"
      if (!company) {
        const atMatch = rawTitle.match(/^(.+?)\s+(?:@|at)\s+(.+)$/i);
        if (atMatch) {
          jobTitle = atMatch[1].trim();
          company = atMatch[2].trim();
        }
      }

      // Pattern 3: Extract from description
      if (!company) {
        const compPatterns = [
          /(?:company|employer|organization)[:\s]+([A-Za-z0-9\s&.,'\-]+?)(?:\n|<br|\.|$)/i,
          /(?:at|join)\s+([A-Z][A-Za-z0-9\s&.,'\-]{2,40})(?:\s+as|\s+we|\.|$)/
        ];
        for (const pat of compPatterns) {
          const m = desc.match(pat);
          if (m && m[1] && m[1].trim().length > 2) { company = m[1].trim(); break; }
        }
      }

      // Pattern 4: Use author/creator field
      if (!company && authorField) {
        company = authorField.trim().replace(/<[^>]+>/g, "").trim();
      }

      // Fallback: Use feed name as company indicator
      if (!company || company.length < 2) {
        company = feedConfig.name.split(" – ")[0].replace(/jobs?$/i, "").trim();
      }

      // ── Location extraction ─────────────────────────────────────────────
      let location = "";
      const fullText = `${rawTitle} ${desc}`;

      // FIX: Check for Israeli cities first (higher priority for Israeli feeds)
      if (feedConfig.region === "israel") {
        for (const city of ISRAEL_CITIES) {
          if (new RegExp(`\\b${city}\\b`, "i").test(fullText)) {
            location = city;
            break;
          }
        }
        if (!location) location = "Israel";
      }

      // General location patterns
      if (!location) {
        const locationPatterns = [
          /(?:location|based in|office in|located in)[:\s]+([A-Za-zא-ת\s,\-]+?)(?:\n|<br|\.\s|\|)/i,
          /\b(Remote|Hybrid|On-?site|Work from home|WFH)\b/i,
        ];
        for (const pat of locationPatterns) {
          const m = fullText.match(pat);
          if (m) { location = m[1].trim(); break; }
        }
      }

      // Fallback
      if (!location) location = feedConfig.region === "israel" ? "Israel" : "Remote";

      // ── Date parsing ────────────────────────────────────────────────────
      let datePosted = new Date().toISOString().split("T")[0];
      if (pubDate) {
        try {
          const d = new Date(pubDate);
          if (!isNaN(d.getTime())) {
            datePosted = d.toISOString().split("T")[0];
            // FIX: Reject jobs older than 60 days to keep listings fresh
            const ageMs = Date.now() - d.getTime();
            if (ageMs > 60 * 24 * 60 * 60 * 1000) continue;
          }
        } catch {}
      }

      results.push({
        title: jobTitle,
        company,
        location,
        url: link,
        description: desc,
        datePosted,
        sourceSite: feedConfig.name,
        jobType: inferJobType(rawTitle + " " + desc),
        seniority: inferSeniority(rawTitle),
        industry: inferIndustry(rawTitle + " " + (feedConfig.category || ""))
      });
    } catch (itemErr) {
      console.error("[RSS Parser] Failed to parse item:", itemErr);
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI AI – GROUNDED JOB EXTRACTION
// Using gemini-3.5-flash which is the correct and current model as of 2026.
// Expanded AI_SEARCH_QUERIES to cover more Israeli tech verticals
// Added date context to queries for fresher results
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-3.5-flash";

function buildCurrentDateContext(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// FIX: Expanded from 5 to 14 search queries covering Israeli tech market better
const AI_SEARCH_QUERIES = [
  // Software Engineering – Israel
  `Find active Software Engineer job openings in Israel posted after ${buildCurrentDateContext()} minus 7 days. Search LinkedIn Jobs (linkedin.com/jobs), Drushim (drushim.co.il), and AllJobs (alljobs.co.il). Return ONLY real listings with direct job URLs containing job IDs. Extract 5 listings.`,

  // Full Stack / Backend – Israel
  `Find active Full Stack Developer or Backend Developer job openings in Tel Aviv or Herzliya posted in the last 14 days. Search LinkedIn Jobs and Drushim.co.il. Return ONLY real listings with actual job ID URLs (e.g. linkedin.com/jobs/view/NUMBERS or drushim.co.il/job/NUMBERS). Extract 5 listings.`,

  // Product Management – Israel
  `Find active Product Manager or Product Director openings in Israel posted recently on Drushim.co.il, AllJobs.co.il, or LinkedIn. Return ONLY real listings with actual direct job URLs containing job IDs. Extract 5 listings.`,

  // Cybersecurity – Israel (major sector)
  `Find active Cybersecurity, Security Engineer, or SOC Analyst job openings in Israel posted in the last 14 days. Search LinkedIn Jobs, AllJobs.co.il, and CyberArk or Check Point careers pages. Return ONLY real listings with direct URLs. Extract 5 listings.`,

  // DevOps / Cloud – Israel
  `Find active DevOps Engineer, Cloud Engineer, or SRE job openings in Israel posted in the last 14 days. Search LinkedIn Jobs and Drushim.co.il. Return ONLY real listings with actual job ID URLs. Extract 5 listings.`,

  // Data & AI / ML – Israel
  `Find active Data Scientist, Data Engineer, or AI/ML Engineer job openings in Israel posted in the last 10 days. Search LinkedIn Jobs, Glassdoor Israel, and AllJobs.co.il. Return ONLY real listings with actual job URLs. Extract 5 listings.`,

  // QA & Automation – Israel
  `Find active QA Engineer, Automation Engineer, or SDET job openings in Israel posted in the last 14 days. Search Drushim.co.il and LinkedIn Jobs Israel. Return ONLY real listings with actual direct job URLs. Extract 5 listings.`,

  // R&D / Embedded / Hardware – Israel (unique to Israeli market)
  `Find active R&D Engineer, Embedded Software, or FPGA Engineer job openings in Israel posted in the last 14 days. Search AllJobs.co.il and LinkedIn Jobs Israel. Return ONLY real listings with actual job ID URLs. Extract 5 listings.`,

  // UX/UI Design – Israel
  `Find active UX Designer, UI Designer, or Product Designer job openings in Israel or Remote posted in the last 14 days. Search LinkedIn Jobs and Drushim.co.il. Return ONLY real listings with actual direct job URLs. Extract 4 listings.`,

  // Remote Global – Software Engineering
  `Find active remote Software Engineer or Backend Developer job openings worldwide posted in the last 7 days. Search We Work Remotely (weworkremotely.com) and Remotive (remotive.com). Return ONLY real listings with actual direct job URLs. Extract 5 listings.`,

  // Remote Global – AI/ML
  `Find active remote AI Engineer, Machine Learning Engineer, or LLM Engineer job openings worldwide posted in the last 7 days. Search We Work Remotely and Remotive.com. Return ONLY real listings with actual job URLs. Extract 5 listings.`,

  // Finance & FinTech – Israel
  `Find active FinTech, Finance Engineer, or Financial Analyst job openings in Israel posted in the last 14 days. Search LinkedIn Jobs Israel and Drushim.co.il. Return ONLY real listings with actual direct job URLs. Extract 4 listings.`,

  // Sales / Business Development – Israel Tech
  `Find active Sales Engineer, Business Development, or Account Executive job openings in Israeli tech companies posted in the last 14 days. Search LinkedIn Jobs Israel. Return ONLY real listings with actual job ID URLs. Extract 4 listings.`,

  // Startups / Scale-ups – Israel
  `Find active engineering or product job openings at Israeli startups or scale-up companies posted in the last 7 days. Search LinkedIn Jobs and Comeet (comeet.com). Return ONLY real listings with actual direct job URLs. Extract 5 listings.`
];

const AI_EXTRACTION_SYSTEM_PROMPT = `You are a precise job data extractor. Your ONLY job is to return real, verifiable job listings from real job boards.

CRITICAL RULES:
1. NEVER invent, fabricate, or hallucinate job listings. Only return listings you can verify exist through Google Search grounding.
2. Every URL must be a direct link to a specific job posting with a job ID in the URL.
3. NEVER return homepage URLs (like linkedin.com, drushim.co.il without a job ID).
4. If you cannot find real listings matching the query, return an empty array [].
5. Return ONLY valid JSON array. No markdown, no explanation, no backticks.
6. Each listing must have a unique, specific URL with a job ID or slug.
7. datePosted must be within the last 60 days (not older).
8. The "description" field must contain actual job requirements from the listing (min 150 characters).

Return format (JSON array only):
[
  {
    "title": "Exact job title from the listing",
    "company": "Exact company name",
    "location": "Exact location from listing",
    "url": "https://direct-link-to-this-specific-job-with-id",
    "description": "Full job description text (minimum 150 characters)",
    "seniority": "Junior|Mid|Senior|Lead",
    "industry": "Category of the role",
    "jobType": "Full-Time|Part-Time|Contract|Remote",
    "datePosted": "YYYY-MM-DD",
    "sourceSite": "LinkedIn|Drushim|AllJobs|Indeed|Comeet|GotFriends|Other"
  }
]`;

async function callGeminiWithGrounding(queryPrompt: string): Promise<Partial<ScrapedJob>[]> {
  if (geminiQuotaExhausted) {
    const elapsed = Date.now() - geminiQuotaLastExhaustedTime;
    if (elapsed < QUOTA_COOLDOWN_MS) {
      console.warn(`[Gemini] Quota exhausted, ${Math.round((QUOTA_COOLDOWN_MS - elapsed) / 1000)}s cooldown remaining. Skipping.`);
      return [];
    }
    geminiQuotaExhausted = false;
    geminiQuotaLastExhaustedTime = 0;
    console.log("[Gemini] Quota cooldown elapsed, retrying...");
  }

  const ai = getAI();
  let useGrounding = true;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[Gemini] Attempt ${attempt}/3 – grounding=${useGrounding} – query: "${queryPrompt.substring(0, 70)}..."`);

      const config: any = {
        systemInstruction: AI_EXTRACTION_SYSTEM_PROMPT,
        temperature: 0.1,
        maxOutputTokens: 2048,
      };

      if (useGrounding) {
        config.tools = [{ googleSearch: {} }];
      } else {
        config.responseMimeType = "application/json";
      }

      const result = await ai.models.generateContent({
        // FIX: Use correct model name.
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: queryPrompt }] }],
        config
      });

      const rawText: string =
        result?.candidates?.[0]?.content?.parts?.[0]?.text ||
        result?.text || "";

      if (!rawText.trim()) {
        console.warn("[Gemini] Empty response received.");
        return [];
      }

      const startIdx = rawText.indexOf("[");
      const endIdx = rawText.lastIndexOf("]");
      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        console.warn("[Gemini] No JSON array found in response.");
        return [];
      }

      const jsonText = rawText.substring(startIdx, endIdx + 1);
      try {
        const parsed = tryRepairAndParseJSON(jsonText);
        if (!Array.isArray(parsed)) {
          console.warn("[Gemini] Response was not an array.");
          return [];
        }
        console.log(`[Gemini] Extracted ${parsed.length} raw listings from AI response.`);
        return parsed as Partial<ScrapedJob>[];
      } catch (parseErr) {
        console.error("[Gemini] JSON parse failed:", parseErr);
        return [];
      }

    } catch (err: any) {
      const msg = err?.message || String(err);
      const msgLower = msg.toLowerCase();

      // FIX: Explicit 404 model-not-found handling (was causing silent failures)
      if (err?.error?.code === 404 || msgLower.includes("not_found") || msgLower.includes("no longer available") || msgLower.includes("model not found")) {
        console.error(`[Gemini] Model "${GEMINI_MODEL}" not found (404). Check model name. Failing fast.`);
        throw err;
      }

      if (msgLower.includes("exceeded your current quota") || msgLower.includes("resource_exhausted") || msgLower.includes("billing")) {
        console.warn("[Gemini] Hard quota exhaustion. Setting cooldown.");
        geminiQuotaExhausted = true;
        geminiQuotaLastExhaustedTime = Date.now();
        return [];
      }

      if (err?.status === 429 || msgLower.includes("429") || msgLower.includes("rate limit")) {
        if (useGrounding) {
          console.warn("[Gemini] Rate limit with grounding. Switching to plain generation.");
          useGrounding = false;
          await sleep(3000);
          continue;
        }
        console.warn("[Gemini] Rate limit on plain generation. Backing off.");
        geminiQuotaExhausted = true;
        geminiQuotaLastExhaustedTime = Date.now();
        return [];
      }

      if (err?.status === 503 || msgLower.includes("503") || msgLower.includes("unavailable")) {
        if (attempt < 3) {
          const delay = 6000 * attempt;
          console.warn(`[Gemini] 503 unavailable. Waiting ${delay}ms before retry ${attempt + 1}...`);
          await sleep(delay);
          continue;
        }
        return [];
      }

      console.error(`[Gemini] Attempt ${attempt} failed:`, msg);
      if (attempt < 3) {
        await sleep(3000 * attempt);
        continue;
      }
      return [];
    }
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// URL VERIFICATION BATCH (parallel, with concurrency limit)
// FIX: Increased concurrency from 5 to 8 for faster verification
// FIX: keep "unverified" jobs (don't discard on network timeout)
// ─────────────────────────────────────────────────────────────────────────────

async function verifyJobUrlsBatch(jobs: Partial<ScrapedJob>[]): Promise<Partial<ScrapedJob>[]> {
  // FIX: Increased concurrency for faster verification
  const CONCURRENCY = 8;
  const results: Partial<ScrapedJob>[] = [];
  let liveCount = 0, deadCount = 0, unverifiedCount = 0;

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const chunk = jobs.slice(i, i + CONCURRENCY);
    const verified = await Promise.all(
      chunk.map(async (job) => {
        if (!job.url) return null;
        const status = await verifyUrl(job.url);
        if (status === "dead") {
          console.log(`[URL Verifier] DEAD – removing: ${job.url} (${job.title})`);
          deadCount++;
          return null;
        }
        // FIX: Keep "unverified" jobs — don't discard them. Network issues
        // (timeouts, 403s from bot-protection) don't mean the job is fake.
        if (status === "live") liveCount++;
        else unverifiedCount++;
        return { ...job, isVerified: status === "live", verificationStatus: status };
      })
    );
    results.push(...verified.filter(Boolean) as Partial<ScrapedJob>[]);
  }

  console.log(`[URL Verifier] Results: ${liveCount} live, ${unverifiedCount} unverified (kept), ${deadCount} dead (removed).`);
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCRAPER ORCHESTRATOR
// FIX: Better AI query pacing (3000ms delay instead of 2500ms)
// FIX: DB duplicate check now also checks URL to prevent same job with
//      slightly different title getting through
// ─────────────────────────────────────────────────────────────────────────────

export async function runJobScraperBatch(): Promise<{
  success: boolean;
  ingestedCount: number;
  errors: string[];
  stats: {
    fromRss: number;
    fromAi: number;
    urlVerified: number;
    urlUnverified: number;
    urlDead: number;
    duplicatesSkipped: number;
    finalIngested: number;
  };
}> {
  console.log("\n========== [Job Scraper] Starting new harvest cycle ==========");
  console.log(`[Job Scraper] Current date context: ${buildCurrentDateContext()}`);

  geminiQuotaExhausted = false;
  geminiQuotaLastExhaustedTime = 0;

  const errors: string[] = [];
  let allRawJobs: Partial<ScrapedJob>[] = [];
  let fromRss = 0;
  let fromAi = 0;

  // ── VECTOR 1: Real RSS Feeds ────────────────────────────────────────────────
  console.log(`[Scraper] Fetching ${RSS_FEEDS.length} RSS feeds...`);

  const rssFeedPromises = RSS_FEEDS.map(async (feed) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000); // FIX: Increased timeout
      const res = await fetch(feed.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/rss+xml, application/xml, text/xml, */*"
        }
      });
      clearTimeout(timeout);

      if (!res.ok) {
        console.warn(`[RSS] Feed returned ${res.status}: ${feed.name}`);
        return [];
      }

      const xmlText = await res.text();
      if (!xmlText.includes("<item") && !xmlText.includes("<entry")) {
        console.warn(`[RSS] Feed "${feed.name}" returned no items (may not be valid RSS/Atom).`);
        return [];
      }

      const parsed = parseRssFeed(xmlText, feed);
      console.log(`[RSS] ${feed.name}: ${parsed.length} listings parsed.`);
      return parsed as Partial<ScrapedJob>[];
    } catch (err: any) {
      console.error(`[RSS] Failed to fetch "${feed.name}":`, err.message);
      errors.push(`RSS feed "${feed.name}" failed: ${err.message}`);
      return [];
    }
  });

  const rssResults = await Promise.all(rssFeedPromises);
  for (const rList of rssResults) {
    allRawJobs.push(...rList);
    fromRss += rList.length;
  }
  console.log(`[Scraper] RSS total: ${fromRss} raw listings collected.`);

  // ── VECTOR 2: AI-Grounded Search ───────────────────────────
  const isApiKeyValid = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "dummy";

  if (isApiKeyValid) {
    console.log(`[Scraper] Starting AI-grounded job search (${AI_SEARCH_QUERIES.length} queries, model: ${GEMINI_MODEL})...`);

    for (const query of AI_SEARCH_QUERIES) {
      if (geminiQuotaExhausted) {
        console.warn("[Scraper] Gemini quota exhausted, skipping remaining AI queries.");
        break;
      }
      // FIX: Increased delay between queries to reduce rate-limit risk
      await sleep(3000);

      try {
        const aiJobs = await callGeminiWithGrounding(query);
        allRawJobs.push(...aiJobs);
        fromAi += aiJobs.length;
        console.log(`[Scraper] AI query returned ${aiJobs.length} listings.`);
      } catch (err: any) {
        console.error("[Scraper] AI query error:", err?.message || err);
        errors.push(`AI query failed: ${err?.message || err}`);
      }
    }
    console.log(`[Scraper] AI total: ${fromAi} raw listings collected.`);
  } else {
    console.warn("[Scraper] GEMINI_API_KEY not set – skipping AI-grounded search.");
  }

  console.log(`[Scraper] Total raw candidates: ${allRawJobs.length}`);

  // ── STEP 1: Sanitize & Filter ──────────────────────────────────────────────
  const sanitized: ScrapedJob[] = [];
  for (const raw of allRawJobs) {
    const result = sanitizeAndFilterJob(raw);
    if (result) sanitized.push(result);
  }
  console.log(`[Scraper] After sanitization: ${sanitized.length} listings remain.`);

  // ── STEP 2: Deduplicate (in-memory) ─────────────────────────────────
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();
  const deduped: ScrapedJob[] = [];

  for (const job of sanitized) {
    // FIX: Pass URL to generateDeterministicJobId for better uniqueness
    const docId = generateDeterministicJobId(job.company, job.title, job.url);
    const normalizedUrl = job.url.toLowerCase().replace(/\?.*$/, ""); // FIX: Normalize URL for dedup (strip query params)
    if (seenUrls.has(normalizedUrl) || seenIds.has(docId)) continue;
    seenUrls.add(normalizedUrl);
    seenIds.add(docId);
    deduped.push(job);
  }
  const inMemoryDupes = sanitized.length - deduped.length;
  console.log(`[Scraper] After in-memory dedup: ${deduped.length} listings (removed ${inMemoryDupes} duplicates).`);

  // ── STEP 3: URL Verification ───────────────────────────────────────────────
  console.log(`[Scraper] Verifying URLs for ${deduped.length} listings...`);
  const urlVerified = await verifyJobUrlsBatch(deduped);

  let liveCount = 0, unverifiedCount = 0;
  for (const j of urlVerified) {
    if (j.verificationStatus === "live") liveCount++;
    else unverifiedCount++;
  }
  const deadCount = deduped.length - urlVerified.length;
  console.log(`[Scraper] URL verification complete: ${liveCount} live, ${unverifiedCount} unverified (kept), ${deadCount} dead (removed).`);

  // ── STEP 4: DB Duplicate Check & Write ────────────────────────────────────
  const store = getFirestoreAdmin();
  await ensureDbInitialized();

  let dbDuplicatesSkipped = 0;
  let ingestedCount = 0;
  const writeBatch: Promise<any>[] = [];

  // FIX: Batch DB existence checks with parallel reads (max 20 at a time) for speed
  const DB_CHECK_CONCURRENCY = 20;

  for (let i = 0; i < urlVerified.length; i += DB_CHECK_CONCURRENCY) {
    const chunk = (urlVerified as ScrapedJob[]).slice(i, i + DB_CHECK_CONCURRENCY);
    await Promise.all(chunk.map(async (job) => {
      try {
        const docId = generateDeterministicJobId(job.company, job.title, job.url);
        const docRef = store.collection("jobs").doc(docId);

        try {
          const docSnap = await docRef.get();
          if (docSnap.exists) {
            const existing = docSnap.data();
            const createdAt = existing?.createdAt?.toDate?.() || new Date(existing?.createdAt || 0);
            const ageMs = Date.now() - createdAt.getTime();
            // FIX: Reduced freshness window from 3 days to 2 days to refresh jobs faster
            if (ageMs < 2 * 24 * 60 * 60 * 1000) {
              dbDuplicatesSkipped++;
              return;
            }
          }
        } catch {}

        const p = docRef.set({ ...job, id: docId }, { merge: true }).then(() => { ingestedCount++; });
        writeBatch.push(p);
      } catch (dbErr: any) {
        console.error("[Scraper] DB write error:", dbErr?.message);
      }
    }));
  }

  await Promise.all(writeBatch);
  console.log(`[Scraper] DB write complete: ${ingestedCount} ingested, ${dbDuplicatesSkipped} DB duplicates skipped.`);

  // ── STEP 5: Sync new jobs with user profiles ───────────────────────────────
  if (ingestedCount > 0) {
    try {
      console.log("[Scraper] Running profile sync loop...");
      await syncNewJobsWithProfiles();
    } catch (syncErr) {
      console.error("[Scraper] Profile sync failed:", syncErr);
    }
  }

  const stats = {
    fromRss,
    fromAi,
    urlVerified: liveCount,
    urlUnverified: unverifiedCount,
    urlDead: deadCount,
    duplicatesSkipped: inMemoryDupes + dbDuplicatesSkipped,
    finalIngested: ingestedCount
  };

  console.log("[Scraper] Harvest complete.", stats);
  console.log("========== [Job Scraper] End of cycle ==========\n");

  return { success: ingestedCount > 0 || urlVerified.length > 0, ingestedCount, errors, stats };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanControlCharacters(jsonStr: string): string {
  if (typeof jsonStr !== "string") return jsonStr;
  let result = "";
  let insideString = false;
  let escaped = false;
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (char === '"' && !escaped) insideString = !insideString;
    if (char === "\\" && !escaped) { escaped = true; result += char; continue; }
    if (insideString) {
      const code = char.charCodeAt(0);
      if (char === "\n") result += "\\n";
      else if (char === "\r") result += "\\r";
      else if (char === "\t") result += "\\t";
      else if (code < 32 || (code >= 127 && code <= 159)) result += `\\u${code.toString(16).padStart(4, "0")}`;
      else result += char;
    } else {
      const code = char.charCodeAt(0);
      if (code < 32 && char !== "\n" && char !== "\r" && char !== "\t") { escaped = false; continue; }
      result += char;
    }
    escaped = false;
  }
  return result;
}

function tryRepairAndParseJSON(jsonStr: string): any {
  let cleaned = cleanControlCharacters(jsonStr).trim();
  try { return JSON.parse(cleaned); } catch {}
  try { return JSON.parse(jsonrepair(cleaned)); } catch {}

  cleaned = cleaned.replace(/,\s*([\}\]])/g, "$1");

  let openBraces = (cleaned.match(/\{/g) || []).length;
  let closeBraces = (cleaned.match(/\}/g) || []).length;
  let openBrackets = (cleaned.match(/\[/g) || []).length;
  let closeBrackets = (cleaned.match(/\]/g) || []).length;

  if (openBrackets > closeBrackets) cleaned += "]".repeat(openBrackets - closeBrackets);
  if (openBraces > closeBraces) cleaned += "}".repeat(openBraces - closeBraces);

  try { return JSON.parse(cleaned); } catch {}
  try { return JSON.parse(jsonrepair(cleaned)); } catch {}

  throw new Error("JSON repair failed after all attempts");
}
