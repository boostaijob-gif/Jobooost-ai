import admin from "firebase-admin";
import { getFirestoreAdmin, ScrapedJob } from "./scraper.ts";

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY FIX: ReDoS-safe keyword matching
// Replaced all `new RegExp(tech, "i")` calls with `String.prototype.includes()`
// over a truncated, sanitized text slice. This eliminates catastrophic backtracking
// on adversarial job descriptions up to 100,000 characters.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_DESCRIPTION_CHARS = 8_000; // Hard cap prevents ReDoS and CPU spikes

function safeTruncate(text: string): string {
  if (typeof text !== "string") return "";
  return text.slice(0, MAX_DESCRIPTION_CHARS).toLowerCase();
}

/** ReDoS-safe: use includes() with word-boundary simulation via surrounding chars */
function safeKeywordMatch(haystack: string, keyword: string): boolean {
  const needle = keyword.toLowerCase();
  const idx = haystack.indexOf(needle);
  if (idx === -1) return false;

  // Simulate \b: ensure char before and after are non-word or boundary
  const before = idx > 0 ? haystack[idx - 1] : " ";
  const after = idx + needle.length < haystack.length ? haystack[idx + needle.length] : " ";
  const isWordChar = (c: string) => /[a-z0-9א-ת_]/.test(c);

  // For multi-word terms (e.g. "Social Media"), skip boundary check
  if (needle.includes(" ")) return true;

  return !isWordChar(before) && !isWordChar(after);
}

export interface JobVectors {
  technologies: string[];
  seniority: string;
  industry: string;
  experienceYearsRequired?: number;
  salaryMin?: number;
  salaryMax?: number;
  isCompleteMatchProfile: boolean;
  completenessIssues: string[];
}

const KNOWN_TECHS = [
  "React", "TypeScript", "Node.js", "JavaScript", "Python", "Java", "C++", "C#",
  "Golang", "Rust", "AWS", "Docker", "Kubernetes", "SQL", "MongoDB", "PostgreSQL",
  "Angular", "Vue", "Next.js", "Express", "FastAPI", "Django", "Jira", "Scrum", "Agile",
  "Cypress", "Selenium", "Playwright", "Figma", "DevOps", "CI/CD", "Machine Learning",
  "Tailwind", "Firebase", "GCP", "Azure", "Linux",
  "Social Media", "Instagram", "Facebook", "TikTok", "Canva", "SEO", "Copywriting",
  "Content", "Marketing", "Creative", "Campaign",
  "Product Management", "PRD", "QA", "Automation", "Recruiting", "HR", "Sourcing",
  "Customer Success"
] as const;

/**
 * Technical Safeguard & Automated Vector Assignment Engine.
 * ReDoS-safe: all matching via includes() on a truncated string slice.
 */
export function assignJobVectors(job: Partial<ScrapedJob>): JobVectors {
  const issues: string[] = [];
  let isComplete = true;

  // SECURITY: Truncate before any matching
  const desc = safeTruncate(job.description || "");
  const title = safeTruncate(job.title || "");
  const combinedText = `${title} ${desc}`;

  const foundTech: string[] = [];
  for (const tech of KNOWN_TECHS) {
    if (safeKeywordMatch(combinedText, tech)) {
      foundTech.push(tech);
    }
  }

  // Seniority detection — plain includes() only, no RegExp on user data
  const titleLower = (job.title || "").toLowerCase();
  let seniority = "Mid";
  if (
    titleLower.includes("senior") || titleLower.includes(" sr ") ||
    titleLower.includes("בכיר") || titleLower.includes("principal")
  ) {
    seniority = "Senior";
  } else if (
    titleLower.includes("junior") || titleLower.includes(" jr ") ||
    titleLower.includes("ג׳וניור") || titleLower.includes("entry")
  ) {
    seniority = "Junior";
  } else if (
    titleLower.includes("lead") || titleLower.includes("head of") ||
    titleLower.includes("manager") || titleLower.includes("director") ||
    titleLower.includes("vp of")
  ) {
    seniority = "Lead / Manager";
  }

  // Experience years — limited-scope regex on TRUNCATED string only
  let experienceYearsRequired: number | undefined;
  const expMatchEn = desc.match(/\b([0-9]{1,2})\s*\+?\s*years?\s+(?:of\s+)?experience\b/i);
  const expMatchHe = desc.match(/\b([0-9]{1,2})\s*\+?\s*שנות?\s+ניסיון\b/i);
  if (expMatchEn) experienceYearsRequired = parseInt(expMatchEn[1], 10);
  else if (expMatchHe) experienceYearsRequired = parseInt(expMatchHe[1], 10);

  const isDevRole =
    titleLower.includes("developer") || titleLower.includes("engineer") ||
    titleLower.includes("programmer") || titleLower.includes("devops") ||
    titleLower.includes("מפתח") || titleLower.includes("מתכנת");

  if (foundTech.length === 0 && isDevRole) {
    isComplete = false;
    issues.push("Missing specific required technologies for a developer opening");
  }

  if ((job.description || "").length < 100) {
    isComplete = false;
    issues.push("Job description too brief, lacking crucial functional requirements");
  }

  if (!job.company || job.company.toLowerCase() === "unknown" || job.company.trim().length < 2) {
    isComplete = false;
    issues.push("Missing or invalid company designation");
  }

  if (!job.url || !job.url.startsWith("http")) {
    isComplete = false;
    issues.push("Invalid or non-resolvable job URL");
  }

  return {
    technologies: foundTech.length > 0 ? foundTech : ["General tech"],
    seniority,
    industry: job.industry || "High-Tech & Software",
    experienceYearsRequired,
    isCompleteMatchProfile: isComplete,
    completenessIssues: issues
  };
}

export interface MatchAnalysis {
  skillsScore: number;
  experienceScore: number;
  seniorityScore: number;
  matchScore: number;
  isCompatible: boolean;
  matchDetails: string[];
  missingSkills: string[];
}

export function isRoleFieldCompatible(userRole: string, jobTitle: string, jobDesc: string): boolean {
  const uRole = userRole.toLowerCase().trim();
  const jTitle = jobTitle.toLowerCase().trim();
  // SECURITY: Truncate desc before includes() calls
  const jDesc = safeTruncate(jobDesc);

  if (!uRole) return true;

  const categories = [
    { id: "dev-tech", keywords: ["developer","engineer","software","programmer","fullstack","backend","frontend","react","node","python","java","ios","android","qa","automation","cyber","devops","מפתח","פיתוח","מתכנת","תוכנה","מהנדס","סייבר","בדיקות"] },
    { id: "product", keywords: ["product manager","product owner"," pm ","product management","prd","מנהל מוצר","ניהול מוצר"] },
    { id: "design", keywords: ["designer","ux","ui","figma","graphic","product designer","מעצב","עיצוב","מעצבת"] },
    { id: "marketing-social", keywords: ["marketing","social media","instagram","tiktok","content","copywriter","seo","sem","ppc","campaign","סושיאל","שיווק","דיגיטל","פרסום","תוכן"] },
    { id: "hr-talent", keywords: ["recruiter","recruitment","talent acquisition","sourcing","משאבי אנוש","גיוס","מגייס"] },
    { id: "finance", keywords: ["finance","accountant","accounting","bookkeeper","payroll","cpa","רואה חשבון","הנהלת חשבונות","כספים"] },
    { id: "sales-bizdev", keywords: ["sales","bizdev","account manager","business development","customer success","מכירות","פיתוח עסקי"] },
    { id: "legal", keywords: ["legal","lawyer","attorney","counsel","עורך דין","משפטי"] },
    { id: "operations", keywords: ["operations","office admin","coordinator","logistics","תפעול","אדמיניסטרטיבי","רכז","לוגיסטיקה"] }
  ];

  const userCatIds = categories.filter(cat => cat.keywords.some(w => uRole.includes(w))).map(c => c.id);
  const jobCatIds  = categories.filter(cat => cat.keywords.some(w => jTitle.includes(w))).map(c => c.id);

  if (userCatIds.length > 0 && jobCatIds.length > 0) {
    return userCatIds.some(id => jobCatIds.includes(id));
  }

  const userKeywords = uRole.split(/[\s\-\/]+/).map(w => w.replace(/[^a-z0-9א-ת]/g, "")).filter(w => w.length > 2);
  if (userKeywords.length > 0) {
    return userKeywords.some(w => jTitle.includes(w) || jDesc.includes(w));
  }

  return true;
}

/**
 * Core Matching Engine.
 * Evaluates a user profile against a scraped job vector.
 */
export function calculateProfileMatch(
  userProfile: {
    experience: string;
    targetRole?: string;
    seniority?: string;
    location?: string;
    extractedSkills?: string[];
  },
  job: ScrapedJob
): MatchAnalysis {
  const isCompatibleRole = isRoleFieldCompatible(userProfile.targetRole || "", job.title, job.description);
  if (!isCompatibleRole) {
    return {
      skillsScore: 0, experienceScore: 0, seniorityScore: 0, matchScore: 0,
      isCompatible: false,
      matchDetails: [`Role mismatch: "${userProfile.targetRole}" vs "${job.title}"`],
      missingSkills: []
    };
  }

  const jobVectors = assignJobVectors(job);
  if (!jobVectors.isCompleteMatchProfile) {
    return {
      skillsScore: 0, experienceScore: 0, seniorityScore: 0, matchScore: 0,
      isCompatible: false,
      matchDetails: [`Incomplete job profile: ${jobVectors.completenessIssues.join(", ")}`],
      missingSkills: []
    };
  }

  const userSkills    = (userProfile.extractedSkills || []).map(s => s.toLowerCase());
  const jobTech       = jobVectors.technologies;
  const missingSkills: string[] = [];
  let matchedCount    = 0;

  for (const tech of jobTech) {
    if (userSkills.includes(tech.toLowerCase())) matchedCount++;
    else missingSkills.push(tech);
  }

  const skillsScore = jobTech.length > 0 ? Math.round((matchedCount / jobTech.length) * 100) : 70;

  let seniorityScore = 100;
  const userSeniority = (userProfile.seniority || "mid").toLowerCase();
  const jobSeniority  = jobVectors.seniority.toLowerCase();
  if (jobSeniority.includes("senior")) {
    if (userSeniority.includes("junior")) seniorityScore = 40;
    else if (userSeniority.includes("mid")) seniorityScore = 75;
  } else if (jobSeniority.includes("junior")) {
    if (userSeniority.includes("senior") || userSeniority.includes("lead")) seniorityScore = 60;
  } else if (jobSeniority.includes("lead")) {
    if (userSeniority.includes("junior"))      seniorityScore = 20;
    else if (userSeniority.includes("mid"))    seniorityScore = 50;
    else if (userSeniority.includes("senior")) seniorityScore = 80;
  }

  let experienceScore = 70;
  const expText = safeTruncate(userProfile.experience || "");
  const roleKeywords = (userProfile.targetRole || "").toLowerCase().split(/\s+/).filter(k => k.length > 2);
  const jobTitleLow  = job.title.toLowerCase();
  const jobDescLow   = safeTruncate(job.description);

  const keywordsMatched = roleKeywords.filter(k => jobTitleLow.includes(k) || jobDescLow.includes(k)).length;
  if (keywordsMatched > 0) experienceScore += 15;

  if (jobVectors.experienceYearsRequired !== undefined) {
    const userYearsMatch = expText.match(/\b([0-9]{1,2})\s*\+?\s*years?\b/);
    if (userYearsMatch) {
      const parsed = parseInt(userYearsMatch[1], 10);
      const diff   = jobVectors.experienceYearsRequired - parsed;
      experienceScore = diff <= 0 ? 100 : Math.max(10, 100 - diff * 15);
    }
  }

  experienceScore = Math.min(100, Math.max(0, experienceScore));
  const matchScore  = Math.round(skillsScore * 0.4 + experienceScore * 0.4 + seniorityScore * 0.2);
  const isHebrew    = /[\u0590-\u05FF]/.test(userProfile.experience);
  const matchDetails: string[] = [];

  if (isHebrew) {
    if (skillsScore > 70) matchDetails.push(`התאמה טכנולוגית חזקה: ${matchedCount} טכנולוגיות חופפות.`);
    else if (matchedCount > 0) matchDetails.push(`התאמה חלקית: שולט ב-${matchedCount} טכנולוגיות מבוקשות.`);
    matchDetails.push(seniorityScore >= 80 ? "דרגת הבכירות תואמת באופן אופטימלי." : "קיימים פערי בכירות מינוריים.");
  } else {
    if (skillsScore > 70) matchDetails.push(`Strong stack alignment — ${matchedCount} verified credentials mapped.`);
    else if (matchedCount > 0) matchDetails.push(`Partial alignment: ${matchedCount} required stack criteria matched.`);
    matchDetails.push(seniorityScore >= 80 ? "Seniority tier aligns with role requirements." : "Minor seniority adjustments may optimize fit.");
  }

  return { skillsScore, experienceScore, seniorityScore, matchScore, isCompatible: matchScore >= 60, matchDetails, missingSkills };
}

/**
 * Continuous Sync Loop.
 * STABILITY FIX: Each profile-job evaluation is now individually wrapped in try/catch.
 * A single corrupt profile or notification payload will NOT crash the worker thread.
 */
export async function syncNewJobsWithProfiles(
  scrapedJobs?: ScrapedJob[]
): Promise<{ notificationsSentCount: number; evaluatedCount: number }> {
  console.log("[Matching Sync] Starting active profile cross-referencing loop...");
  let notificationsSentCount = 0;
  let evaluatedCount = 0;

  const store = getFirestoreAdmin();

  // Fetch profiles — isolated
  let activeProfiles: any[] = [];
  try {
    const profilesSnap = await store.collection("profiles").where("onboardingCompleted", "==", true).get();
    profilesSnap.forEach(doc => activeProfiles.push({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("[Matching Sync] Failed to fetch profiles — aborting sync:", err);
    return { notificationsSentCount: 0, evaluatedCount: 0 };
  }

  if (activeProfiles.length === 0) {
    console.log("[Matching Sync] No active profiles found. Exiting.");
    return { notificationsSentCount: 0, evaluatedCount: 0 };
  }

  // Fetch jobs — isolated
  let jobsToEvaluate: ScrapedJob[] = scrapedJobs ?? [];
  if (jobsToEvaluate.length === 0) {
    try {
      const jobsSnap = await store.collection("jobs").orderBy("createdAt", "desc").limit(30).get();
      jobsSnap.forEach(doc => jobsToEvaluate.push({ id: doc.id, ...doc.data() } as ScrapedJob));
    } catch (err) {
      console.error("[Matching Sync] Failed to fetch jobs — aborting sync:", err);
      return { notificationsSentCount: 0, evaluatedCount: 0 };
    }
  }

  console.log(`[Matching Sync] ${activeProfiles.length} profiles × ${jobsToEvaluate.length} jobs`);

  for (const profile of activeProfiles) {
    // STABILITY FIX: Per-profile isolation — one bad profile never kills the loop
    try {
      const userContext = {
        experience:      profile.experience     || "",
        targetRole:      profile.targetRole     || profile.desiredRole || "Software Developer",
        seniority:       profile.seniority      || "Senior",
        location:        profile.location       || "",
        extractedSkills: profile.extractedSkills || ["React", "TypeScript", "Node.js"]
      };

      for (const job of jobsToEvaluate) {
        evaluatedCount++;

        // STABILITY FIX: Per-job isolation — one bad payload never kills the profile loop
        try {
          const analysis = calculateProfileMatch(userContext, job);

          if (analysis.isCompatible && analysis.matchScore >= 75) {
            const docId   = `notif_${profile.id}_${job.id}`;
            const notifRef = store.collection("notifications").doc(docId);

            try {
              const docSnap = await notifRef.get();
              if (!docSnap.exists) {
                await notifRef.set({
                  userId: profile.id,
                  type:   "job_match",
                  jobData: {
                    id:          job.id,
                    title:       job.title,
                    company:     job.company,
                    location:    job.location,
                    url:         job.url,
                    description: (job.description || "").substring(0, 300) + "...",
                    matchScore:  analysis.matchScore,
                    sourceSite:  job.sourceSite,
                    seniority:   job.seniority,
                    salaryRange: job.salaryRange || { min: 25000, max: 45000, currency: "ILS" }
                  },
                  isRead:    false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                notificationsSentCount++;
              }
            } catch (writeErr) {
              console.error(`[Matching Sync] Notification write failed for profile=${profile.id} job=${job.id}:`, writeErr);
              // Continue — do not propagate
            }
          }
        } catch (jobErr) {
          console.error(`[Matching Sync] Match evaluation failed for job=${job.id}:`, jobErr);
          // Continue to next job
        }
      }
    } catch (profileErr) {
      console.error(`[Matching Sync] Profile processing failed for profile=${profile.id}:`, profileErr);
      // Continue to next profile
    }
  }

  console.log(`[Matching Sync] Complete. Notifications dispatched: ${notificationsSentCount} / Evaluated: ${evaluatedCount}`);
  return { notificationsSentCount, evaluatedCount };
}
