import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Coins,
  Brain,
  Compass,
  Map as MapIcon,
  Settings as SettingsIcon,
  Search,
  CheckCircle2,
  AlertCircle,
  Layout,
  Briefcase,
  History,
  Upload,
  Globe,
  User as UserIcon,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Sparkles,
  RefreshCw,
  TrendingUp,
  X,
  Plus,
  MessageSquare,
  FileText,
  Star,
  ExternalLink,
  ChevronLeft,
  Sun,
  Moon,
  Building2,
  MapPin,
  Bell,
  BellRing,
  Heart,
  Eye,
  Lock,
  Mail,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AlignmentData, JobOpportunity, UserFeedback } from "./types";
import { 
  submitFeedback, 
  subscribeToAuth, 
  signInWithGoogle, 
  logout,
  saveJobAlert,
  getJobAlerts,
  deleteJobAlert,
  listenToNotifications,
  markNotificationAsRead,
  createMockNotification,
  getUserProfile,
  updateUserProfile,
  toggleJobLike,
  subscribeToSavedJobs,
  clearAllNotifications,
  generateJobId,
  subscribeToUserProfile
} from "./lib/firebase";
import { type User } from "firebase/auth";
import { IntroOnboardingModal } from "./components/OnboardingModal";
import { AIChatPrep } from "./components/AIChatPrep";
import { UpgradeModal } from "./components/UpgradeModal";
import { PoliciesPage } from "./components/Policies";

function OnboardingModal({ 
  user, 
  profile,
  isHebrew, 
  onComplete 
}: { 
  user: User; 
  profile?: any;
  isHebrew: boolean; 
  onComplete: () => void;
}) {
  const [email, setEmail] = useState(profile?.email || user.email || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateUserProfile(user.uid, {
        email,
        phone,
        location,
        onboardingCompleted: true
      });
      onComplete();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-stone-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-100 dark:border-stone-800"
      >
        <div className="p-8 space-y-8">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">
              {isHebrew ? "כמעט שם!" : "Almost there!"}
            </h2>
            <p className="text-stone-500 text-sm font-medium">
              {isHebrew 
                ? "בוא נשלים את הפרופיל שלך כדי לקבל הזדמנויות רלוונטיות." 
                : "Let's complete your profile to get the most relevant opportunities."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">
                  {isHebrew ? "אימייל" : "Email"}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">
                  {isHebrew ? "טלפון" : "Phone"}
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+972-50-000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">
                  {isHebrew ? "מיקום" : "Location"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isHebrew ? "למשל: תל אביב" : "e.g. Tel Aviv"}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all dark:text-white"
                />
              </div>
            </div>

            <button
              disabled={isSubmitting}
              className="w-full py-4 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-900 font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-amber-400/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                isHebrew ? "בוא נתחיל" : "Let's Go"
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

enum Tab {
  Explore = "explore",
  Growth = "growth",
  Settings = "settings",
}

type ReflectionState = "thinking" | "insights" | "interviewPrep";

function LoadingSequence({ isHebrew }: { isHebrew: boolean }) {
  const steps = isHebrew
    ? [
        "מתחבר למנוע התובנות של 2026...",
        "סורק דינמיקות שוק במיקום הנבחר...",
        "מנתח יתרונות תחרותיים של המועמד...",
        "מחשב התאמת מילות מפתח ליכולות...",
        "בונה מפת דרכים אסטרטגית...",
        "מגבש שאלות לראיונות עבודה...",
        "מזקק את התוצאות הסופיות...",
      ]
    : [
        "Connecting to 2026 insights engine...",
        "Scanning local market dynamics...",
        "Identifying competitive advantages...",
        "Calculating keyword skill alignment...",
        "Architecting growth roadmap...",
        "Synthesizing interview strategy...",
        "Refining final intelligence...",
      ];

  const [currentStep, setCurrentStep] = React.useState(0);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      setProgress((p) => Math.min(p + 100 / steps.length, 100));
    }, 1200);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="space-y-12 w-full max-w-xl mx-auto px-4">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <motion.h2
            key={currentStep}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl md:text-3xl font-black tracking-tight text-stone-900 dark:text-white"
          >
            {isHebrew ? "מזקקים את אסטרטגיית הצמיחה שלך" : "Architecting your growth strategy"}
          </motion.h2>
          <span className="text-xl font-black text-amber-500 tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-stone-900 dark:bg-amber-400"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-stone-500 dark:text-stone-400 font-medium leading-relaxed italic text-sm md:text-base">
          {steps[currentStep]}
        </p>
      </div>

      <div className="relative flex justify-center py-20">
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-48 h-48 border border-stone-200 dark:border-stone-800 rounded-full"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [0.8, 1.8],
                opacity: [0.4, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 1,
                ease: "easeOut",
              }}
            />
          ))}
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="relative z-10 w-24 h-24 bg-white dark:bg-stone-900 rounded-3xl shadow-2xl flex items-center justify-center border border-stone-100 dark:border-stone-800"
          >
            <Brain className="w-12 h-12 text-stone-900 dark:text-amber-400" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function GrowthRoadmap({ roadmap, isHebrew }: { roadmap: Array<{ phase: string; actions: string[]; expectedImpact: string }>, isHebrew: boolean }) {
  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <TrendingUp className="w-6 h-6 text-amber-500" />
        <h3 className="text-xl font-black uppercase tracking-widest text-stone-900 dark:text-white">
          {isHebrew ? "מפת דרכים לצמיחה אישית" : "Executive Growth Roadmap"}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roadmap?.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.2 }}
            className="group relative bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all h-full flex flex-col"
          >
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-900 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg">
              {i + 1}
            </div>
            
            <div className="space-y-6 flex-1">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                  {isHebrew ? "שלב" : "Phase"}
                </span>
                <h4 className="text-2xl font-black text-stone-900 dark:text-white leading-tight">
                  {step.phase}
                </h4>
              </div>
              
              <ul className="space-y-4">
                {step.actions?.map((action, ai) => (
                  <li key={ai} className="flex gap-3 text-sm text-stone-500 dark:text-stone-400 leading-relaxed font-medium">
                    <div className="w-1 h-1 rounded-full bg-amber-400 mt-2 shrink-0" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mt-8 pt-6 border-t border-stone-50 dark:border-stone-800/50">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-2 block">
                {isHebrew ? "אימפקט צפוי" : "Expected Impact"}
              </span>
              <p className="text-sm font-bold text-emerald-500 dark:text-emerald-400">
                {step.expectedImpact}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [isSharedMode] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("shared") === "true";
    }
    return false;
  });
  const [linkCopied, setLinkCopied] = useState(false);

  const [currentUrlPage, setCurrentUrlPage] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const page = params.get("page") || window.location.pathname.replace(/^\//, "");
      const val = page.toLowerCase();
      if (["terms", "privacy", "refund", "pricing"].includes(val)) {
        return val;
      }
    }
    return null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const page = params.get("page") || window.location.pathname.replace(/^\//, "");
      const val = page.toLowerCase();
      if (["terms", "privacy", "refund", "pricing"].includes(val)) {
        setCurrentUrlPage(val);
      } else {
        setCurrentUrlPage(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>(Tab.Explore);
  const [reflectionState, setReflectionState] = useState<ReflectionState>("insights");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return (
      saved === "dark" ||
      (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem("onboardingCompleted") !== "true";
  });
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [activePracticeQuestion, setActivePracticeQuestion] = useState<{ question: string; reason: string } | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [jobAlerts, setJobAlerts] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [cachedSnapshotJobs, setCachedSnapshotJobs] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Prefetch the lightweight snapshot from server on boot
    fetch("/api/jobs/snapshot")
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.jobs)) {
          setCachedSnapshotJobs(data.jobs);
          console.log(`[Offline Engine] Prefetched ${data.jobs.length} lightweight cached jobs.`);
        }
      })
      .catch(err => console.warn("[Offline Engine] Prefetch warning:", err));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Derived state for quick lookup
  const likedJobIds = savedJobs.map(sj => sj.jobId);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profileData = await getUserProfile(user.uid);
          if (profileData) {
            if (profileData.userName) setUserName(profileData.userName);
            if (profileData.experience) setExperience(profileData.experience);
            if (profileData.jobDescription) setJobDescription(profileData.jobDescription);
            if (profileData.jobUrl) setJobUrl(profileData.jobUrl);
            if (profileData.selectedLocation) setSelectedLocation(profileData.selectedLocation);
            if (profileData.environment) setEnvironment(profileData.environment);
            if (profileData.seniority) setSeniority(profileData.seniority);
            if (profileData.minSalary) setMinSalary(profileData.minSalary);
            if (profileData.maxSalary) setMaxSalary(profileData.maxSalary);
            if (profileData.salaryCurrency) setSalaryCurrency(profileData.salaryCurrency);
            if (profileData.alignmentData) setAlignmentData(profileData.alignmentData);
            if (profileData.hasAnalyzed !== undefined) setHasAnalyzed(profileData.hasAnalyzed);
          } else {
            setUserName(user.displayName || "");
          }
        } catch (err) {
          console.error("Failed to load user profile on login:", err);
          setUserName(user.displayName || "");
        }
      } else {
        setUserProfile(null);
        setOnboardingRequired(false);
        setUserName("");
        setExperience("");
        setJobDescription("");
        setJobUrl("");
        setSelectedLocation("Israel");
        setEnvironment("Hybrid");
        setSeniority("Mid-level");
        setMinSalary("25000");
        setMaxSalary("45000");
        setSalaryCurrency("ILS");
        setAlignmentData(null);
        setHasAnalyzed(false);

        // Clear local storage keys to protect user's privacy when signed out
        const savedTheme = localStorage.getItem("theme");
        localStorage.clear();
        if (savedTheme) localStorage.setItem("theme", savedTheme);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      // Check query params for payment redirection
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment_success") === "true") {
        const provider = params.get("provider");
        const subId = params.get("subscription_id") || params.get("sessionId");
        const urlUserId = params.get("userId") || currentUser.uid;

        if (provider === "paypal" && subId && urlUserId === currentUser.uid) {
          fetch("/api/payments/paypal/capture", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("firebaseToken") || currentUser.uid}`
            },
            body: JSON.stringify({ subscription_id: subId, userId: currentUser.uid })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              console.log("[Finance Frontend] PayPal subscription successfully verified and activated!");
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch(err => console.error("[Finance Frontend] Failed to capture PayPal sub:", err));
        } else if (provider === "stripe" || provider === "paddle") {
          console.log("[Finance Frontend] Checkout session resolved. Awaiting backend webhook.");
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      const unsubProfile = subscribeToUserProfile(currentUser.uid, (profile) => {
        setUserProfile(profile);
        if (!profile || !profile.onboardingCompleted) {
          setOnboardingRequired(true);
        } else {
          setOnboardingRequired(false);
        }
      });
      const unsubNotifs = listenToNotifications(currentUser.uid, (data) => {
        setNotifications(data);
      });
      const unsubLikes = subscribeToSavedJobs(currentUser.uid, (data) => {
        setSavedJobs(data);
      });
      refreshJobAlerts();
      return () => {
        unsubProfile();
        unsubNotifs();
        unsubLikes();
      };
    } else {
      setNotifications([]);
      setJobAlerts([]);
      setSavedJobs([]);
    }
  }, [currentUser]);

  const refreshJobAlerts = async () => {
    if (currentUser) {
      const alerts = await getJobAlerts(currentUser.uid);
      setJobAlerts(alerts || []);
    }
  };

  const handleCopySecureShareLink = () => {
    try {
      const secureUrl = `${window.location.origin}${window.location.pathname}?shared=true`;
      navigator.clipboard.writeText(secureUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 4000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleSaveAlert = async () => {
    if (!currentUser) {
      signInWithGoogle();
      return;
    }
    
    // Simple deduplication check locally
    const isDuplicate = jobAlerts.some(a => 
      a.title === (jobDescription || alignmentData?.roleTitle) && 
      a.location === selectedLocation
    );

    if (isDuplicate) {
      // Just showing console warning for now to avoid alert()
      console.warn("Alert already exists");
      return;
    }

    try {
      await saveJobAlert({
        userId: currentUser.uid,
        title: jobDescription || alignmentData?.roleTitle || "Product Manager",
        location: selectedLocation,
        seniority,
        environment
      });
      refreshJobAlerts();
    } catch (error) {
      console.error(error);
    }
  };

  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState<UserFeedback["type"]>("suggestion");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    setIsSubmittingFeedback(true);
    try {
      await submitFeedback({
        userId: userName || "guest",
        email: null,
        message: feedbackMessage,
        type: feedbackType,
      });
      setFeedbackSuccess(true);
      setFeedbackMessage("");
      setTimeout(() => setFeedbackSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      alert(isHebrew ? "שגיאה בשליחת המשוב" : "Error sending feedback");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("joboost_onboarding_complete", "true");
    setShowOnboarding(false);
  };

  function OnboardingFlow({ isHebrew }: { isHebrew: boolean }) {
    const [step, setStep] = useState(0);
    const onboardingSteps = isHebrew
      ? [
          {
            title: "ברוך הבא ל-JobBoost",
            description:
              "הכלי המקצועי שלך לניווט בקריירה ב-2026. בוא נכיר את המערכת.",
            icon: <Sparkles className="w-12 h-12 text-amber-400" />,
          },
          {
            title: "טאב Explore",
            description:
              "כאן אתה מזין את הניסיון שלך (או מעלה קורות חיים) ומגדיר את היעד המקצועי הבא שלך.",
            icon: (
              <Compass className="w-12 h-12 text-stone-900 dark:text-white" />
            ),
          },
          {
            title: "טאב Reflections",
            description:
              "לאחר הניתוח, תקבל כאן מפת דרכים אסטרטגית, שאלות הכנה לראיונות והזדמנויות עבודה חיות.",
            icon: (
              <Brain className="w-12 h-12 text-stone-900 dark:text-white" />
            ),
          },
          {
            title: "הגדרות אישיות",
            description:
              "התאם את השפה (עברית/אנגלית) ועבור למצב כהה (Midnight Mode) לנוחות מקסימלית.",
            icon: (
              <SettingsIcon className="w-12 h-12 text-stone-900 dark:text-white" />
            ),
          },
        ]
      : [
          {
            title: "Welcome to JobBoost",
            description:
              "Your executive companion for navigating the 2026 job market. Let's get you aligned.",
            icon: <Sparkles className="w-12 h-12 text-amber-400" />,
          },
          {
            title: "The Explore Hub",
            description:
              "Input your leadership profile or upload a resume to define your target trajectory.",
            icon: (
              <Compass className="w-12 h-12 text-stone-900 dark:text-white" />
            ),
          },
          {
            title: "Reflections Intelligence",
            description:
              "Access your 2026 roadmap, interview simulations, and live market intelligence here.",
            icon: (
              <Brain className="w-12 h-12 text-stone-900 dark:text-white" />
            ),
          },
          {
            title: "Global Customization",
            description:
              "Switch languages and activate Midnight Mode to suit your executive environment.",
            icon: (
              <SettingsIcon className="w-12 h-12 text-stone-900 dark:text-white" />
            ),
          },
        ];

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white dark:bg-stone-900 w-full max-w-md rounded-[3rem] p-10 md:p-12 shadow-2xl border border-stone-100 dark:border-stone-800 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-stone-100 dark:bg-stone-950">
            <motion.div
              className="h-full bg-stone-900 dark:bg-amber-400"
              initial={{ width: "0%" }}
              animate={{
                width: `${((step + 1) / onboardingSteps.length) * 100}%`,
              }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="w-24 h-24 bg-stone-50 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto">
                {onboardingSteps[step].icon}
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl md:text-3xl font-black tracking-tight dark:text-white">
                  {onboardingSteps[step].title}
                </h3>
                <p className="text-stone-500 dark:text-stone-400 leading-relaxed font-medium">
                  {onboardingSteps[step].description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-12 flex gap-4">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 h-16 border-2 border-stone-100 dark:border-stone-800 rounded-2xl font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
              >
                {isHebrew ? "חזור" : "Back"}
              </button>
            )}
            <button
              onClick={() =>
                step < onboardingSteps.length - 1
                  ? setStep(step + 1)
                  : completeOnboarding()
              }
              className="flex-[2] h-16 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-900 rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform"
            >
              {step < onboardingSteps.length - 1
                ? isHebrew
                  ? "המשך"
                  : "Continue"
                : isHebrew
                  ? "התחל שימוש"
                  : "Get Started"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // User Inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userName, setUserName] = useState(() => localStorage.getItem("userName") || "");
  const [experience, setExperience] = useState(() => localStorage.getItem("experience") || "");
  const [jobDescription, setJobDescription] = useState(() => localStorage.getItem("jobDescription") || "");
  const [jobUrl, setJobUrl] = useState(() => localStorage.getItem("jobUrl") || "");
  const [selectedLocation, setSelectedLocation] = useState(() => localStorage.getItem("selectedLocation") || "Israel");
  const [environment, setEnvironment] = useState(() => localStorage.getItem("environment") || "Hybrid");
  const [seniority, setSeniority] = useState(() => localStorage.getItem("seniority") || "Mid-level");
  const [minSalary, setMinSalary] = useState(() => localStorage.getItem("minSalary") || "25000");
  const [maxSalary, setMaxSalary] = useState(() => localStorage.getItem("maxSalary") || "45000");
  const [salaryCurrency, setSalaryCurrency] = useState(() => localStorage.getItem("salaryCurrency") || "ILS");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Analysis State
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  useEffect(() => { if (currentUser) localStorage.setItem("userName", userName); }, [userName, currentUser]);
  useEffect(() => { if (currentUser) localStorage.setItem("experience", experience); }, [experience, currentUser]);
  useEffect(() => { if (currentUser) localStorage.setItem("jobDescription", jobDescription); }, [jobDescription, currentUser]);
  useEffect(() => { if (currentUser) localStorage.setItem("jobUrl", jobUrl); }, [jobUrl, currentUser]);
  useEffect(() => { if (currentUser) localStorage.setItem("selectedLocation", selectedLocation); }, [selectedLocation, currentUser]);
  useEffect(() => { if (currentUser) localStorage.setItem("environment", environment); }, [environment, currentUser]);
  useEffect(() => { if (currentUser) localStorage.setItem("seniority", seniority); }, [seniority, currentUser]);
  useEffect(() => { if (currentUser) localStorage.setItem("minSalary", minSalary); }, [minSalary, currentUser]);
  useEffect(() => { if (currentUser) localStorage.setItem("maxSalary", maxSalary); }, [maxSalary, currentUser]);
  useEffect(() => { if (currentUser) localStorage.setItem("salaryCurrency", salaryCurrency); }, [salaryCurrency, currentUser]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [alignmentData, setAlignmentData] = useState<AlignmentData | null>(null);

  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);

  // Job Filters
  const [jobFilterSearch, setJobFilterSearch] = useState("");
  const [jobFilterSeniorities, setJobFilterSeniorities] = useState<string[]>([]);
  const [jobFilterIndustries, setJobFilterIndustries] = useState<string[]>([]);
  const [jobFilterTechnologies, setJobFilterTechnologies] = useState<string[]>([]);
  const [jobFilterMinSalary, setJobFilterMinSalary] = useState<number>(0);
  const [jobFilterMinMatch, setJobFilterMinMatch] = useState(0);

  const clearSession = () => {
    if (
      window.confirm(
        isHebrew
          ? "האם אתה בטוח שברצונך למחוק את כל הנתונים?"
          : "Are you sure you want to clear all session data?",
      )
    ) {
      const savedTheme = localStorage.getItem("theme");
      const savedOnboarding = localStorage.getItem("onboardingCompleted");
      localStorage.clear();
      if (savedTheme) localStorage.setItem("theme", savedTheme);
      if (savedOnboarding) localStorage.setItem("onboardingCompleted", savedOnboarding);
      window.location.reload();
    }
  };

  const isHebrew = i18n.language === "he";

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || isExtracting || isAnalyzing) return;

    setIsExtracting(true);
    setAnalysisError(null);
    setUploadedFileName(file.name);
    setUploadSuccess(false);

    try {
      let fullText = "";

      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        const pdfjs = await import("pdfjs-dist");
        // Use a stable CDN for the worker that matches the installed version range (v5 uses .min.mjs)
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");
          fullText += pageText + "\n";
        }
      } else if (
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        fullText = result.value;
      } else {
        throw new Error(
          isHebrew
            ? "סוג קובץ לא נתמך. אנא העלה PDF או DOCX."
            : "Unsupported file type. Please upload PDF or DOCX.",
        );
      }

      const trimmedText = fullText.trim();
      if (!trimmedText) {
        throw new Error(
          isHebrew
            ? "לא נמצא טקסט קריא בקובץ שהועלה."
            : "No readable text found in the uploaded file.",
        );
      }

      setExperience(trimmedText);
      setUploadSuccess(true);

      setTimeout(() => analyzeWithAI(trimmedText), 500);
    } catch (err) {
      console.error("Extraction Error:", err);
      setUploadedFileName(null);
      setUploadSuccess(false);
      setAnalysisError(
        err instanceof Error
          ? err.message
          : isHebrew
            ? "כשל בחילוץ טקסט מהקובץ"
            : "Failed to extract text from file",
      );
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTabChange = (tab: Tab) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveTab(tab);
    if (tab === Tab.Explore && !hasAnalyzed) {
      setAnalysisError(null);
      setReflectionState("insights");
    }
  };

  const analyzeWithAI = async (experienceOverride?: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setReflectionState("thinking");
    setActiveTab(Tab.Growth);

    if (isOffline) {
      console.log("[Offline Engine] Processing client-side match report from downloaded snapshots...");
      // Simulate analysis delay
      await new Promise(r => setTimeout(r, 1500));
      
      const matched = (cachedSnapshotJobs.length > 0 ? cachedSnapshotJobs : [
        {
          id: "cached-1",
          title: "Full Stack Engineer (React/Node.js)",
          company: "Wix.com",
          location: "Tel Aviv-Yafo",
          url: "https://www.linkedin.com/jobs/search/?keywords=Full+Stack+Engineer+Wix&location=Israel",
          description: "Wix.com is looking for a brilliant Full Stack software engineer to join our core product teams.",
          seniority: "Mid",
          industry: "High-Tech / Software",
          jobType: "Hybrid",
          sourceSite: "LinkedIn",
          technologies: ["React", "Node.js", "TypeScript"]
        }
      ]).slice(0, 8).map((op, index) => {
        return {
          ...op,
          matchScore: 85 - index * 3,
          matchDetails: [
            isHebrew ? "מראה התאמה גבוהה לדרישות הטכנולוגיות העיקריות שלך" : "Matches your primary technical background metrics.",
            isHebrew ? `מתאים למיקום המבוקש (${selectedLocation}) ורמת הניסיון (${seniority})` : `Aligned with your target location (${selectedLocation}) and seniority (${seniority}).`
          ],
          missingSkills: [isHebrew ? "טכנולוגיות פריים-טיים ספציפיות" : "Specific stack deep-dives"],
          matchAnalysis: { skillsScore: 80, experienceScore: 90, seniorityScore: 85 }
        };
      });

      const localReport = {
        roleTitle: jobDescription || (isHebrew ? "מפתח מערכות בכיר" : "Lead software engineer"),
        refinedResume: isHebrew 
          ? `פרופיל מקצועי מותאם שנבנה במצב לא-מקוון עבור תפקידי ${jobDescription}. מיומנויות ליבה זוהו מתוך קובץ ה-CV שלך.`
          : `Offline optimized professional summary generated for ${jobDescription || "target roles"}. Core skills extracted from local session profile.`,
        differentiators: [
          isHebrew ? "יכולת פיתוח ואינטגרציה של מערכות קצה לקצה" : "Proven end-to-end stack development capacity",
          isHebrew ? "התמחות בטכנולוגיות ופריימוורקים מודרניים" : "Specialization in modern front/back architectures",
          isHebrew ? "יכולת פתרון בעיות מורכבות תחת עומס עבודה גבוה" : "Strong adaptive problem-solving skills"
        ],
        extractedSkills: ["React", "Node.js", "TypeScript", "JavaScript", "SQL", "Tailwind CSS"],
        growthRoadmap: [
          {
            phase: isHebrew ? "פעולות מיידיות" : "Immediate Actions",
            actions: [
              isHebrew ? "בצע סימולציית ראיונות דיבורית במצב לא-מקוון" : "Run offline audio interview drills via AIChatPrep",
              isHebrew ? "עדכן את מיומנויות הליבה בפרופיל האישי" : "Update core skill tags inside your profile"
            ],
            expectedImpact: isHebrew ? "שיפור משמעותי באחוזי המענה הראשוני לראיונות" : "Boost initial interview callbacks significantly"
          }
        ],
        marketOpportunities: matched,
        guidelines: [
          isHebrew ? "במצב לא-מקוון, מומלץ להתחקות קודם אחר משרות שמורות במדור." : "In offline state, prioritize reviewing previously saved alignment jobs."
        ],
        questions: [
          {
            question: isHebrew ? "ספר על פרויקט מורכב שפיתחת ואיך התמודדת עם בעיות ביצועים." : "Describe a complex engineering challenge you solved and how you optimized scalability.",
            reason: isHebrew ? "בוחן הבנת עומקים ושיפור ביצועי מערכת מול תרחישי אמת." : "Assesses deep technical grasp under system bottlenecks."
          }
        ],
        isFallback: true,
        isCachedFallback: true
      };

      setAlignmentData(localReport as any);
      setHasAnalyzed(true);
      setReflectionState("insights");
      setIsAnalyzing(false);
      return;
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.uid,
          userEmail: currentUser?.email || "developer@example.com",
          userName,
          experience: experienceOverride ?? experience,
          targetRole: jobDescription,
          location: selectedLocation,
          language: i18n.language,
          environment,
          seniority,
          minSalary,
          maxSalary,
          salaryCurrency,
        }),
      });

      if (response.status === 402) {
        setIsUpgradeModalOpen(true);
        setIsAnalyzing(false);
        setReflectionState("insights");
        return;
      }

      if (!response.ok) {
        let errorMessage = "Analysis failed";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            const textError = await response.text();
            console.error("Non-JSON error response:", textError);
            errorMessage = `Server Error: ${response.status} ${response.statusText}`;
          }
        } catch (parseErr) {
          errorMessage = `Connection Error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setAlignmentData(data);
      setHasAnalyzed(true);
      setReflectionState("insights");
    } catch (err: any) {
      console.error("Analysis Error Details:", err);
      setAnalysisError(err.message || "Analysis failed");
      // Ensure we don't get stuck in thinking state if error occurs after fetch but before setting state
      setReflectionState("thinking"); 
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyResume = () => {
    if (alignmentData?.refinedResume) {
      navigator.clipboard.writeText(alignmentData.refinedResume);
      setShowCopyTooltip(true);
      setTimeout(() => setShowCopyTooltip(false), 2000);
    }
  };

  const loadSampleData = () => {
    const isHeb = i18n.language === "he";
    const sampleData: AlignmentData = isHeb ? {
      roleTitle: "מנהל מוצר בכיר (Senior Product Manager)",
      refinedResume: `אדריכל מוצר וקריירה בכיר בעל למעלה מ-5 שנות ניסיון בהובלת מוצרי תוכנה ובינה מלאכותית מקצה לקצה.
ניסיון מוכח בהובלת צוותים מרובי ממשקים, בניית אסטרטגיית מוצר, אפיון דרישות וכתיבת מסמכי PRD.
מתמחה בניתוח נתונים, שיפור מדדי מעורבות משתמשים (Engagement) ושיתוף פעולה הדוק עם צוותי פיתוח, עיצוב ושיווק.

💼 ניסיון מקצועי בולט:
- הובלת אסטרטגיית מוצר מקצה לקצה עבור פלטפורמת SaaS מבוססת AI, שהביאה לעלייה של 35% ב-ARR.
- אפיון והשקה של 3 מוצרים מורכבים המשמשים מיליוני משתמשים ברחבי העולם.
- ניתוח נתונים מתקדם ושיפור מדדי Retention ב-20% באמצעות אופטמיזציה של תהליכי Onboarding.`,
      differentiators: [
        "ניסיון מעשי מוכח בהובלת מוצרי פיתוח מבוססי AI ו-SaaS בעלי השפעה עסקית מוכחת",
        "יכולת אנליטית גבוהה וקבלת החלטות מבוססות נתונים הנתמכת במדדים עסקיים אמיתיים",
        "מיומנויות תקשורת והובלת ממשקים מורכבים בסביבה גלובלית ודינמית"
      ],
      extractedSkills: [
        "Product Strategy", "SaaS Development", "AI/ML Integration", "Data Analysis", "Roadmapping", "PRD Design", "SQL & Tableau", "A/B Testing", "Agile Methodologies"
      ],
      growthRoadmap: [
        {
          phase: "שלב א׳: מיידי (חודשים 1-3)",
          actions: [
            "שדרוג פרופיל הלינקדאין והקו\"ח בדגש על הישגים כמותיים (Metrics-Driven Impact)",
            "מיקוד ברשת הקשרים (Networking) בחברות יעד מובילות בהרצליה פיתוח ותל אביב",
            "חיזוק מיומנויות טכניות בתחום ה-Prompt Engineering ואינטגרציות LLM"
          ],
          expectedImpact: "הגדלה משמעותית של אחוז המענה לקורות החיים וזימונים לראיונות עבודה ראשוניים."
        },
        {
          phase: "שלב ב׳: טווח קצר (חודשים 4-6)",
          actions: [
            "השתתפות במיטאפים וקהילות ניהול מוצר מובילות בישראל",
            "מעבר סימולציות ראיונות עבודה מקיפות (שאלות התנהגותיות ומקרי בוחן מוצרים)",
            "בניית תיק עבודות המציג פתרון בעיה מורכבת בתחום המוצר"
          ],
          expectedImpact: "מעבר מוצלח של שלבי המיון המתקדמים ומבחני הבית בחברות היעד."
        },
        {
          phase: "שלב ג׳: טווח ארוך (חודשים 6-12)",
          actions: [
            "קבלת הצעת עבודה אטרקטיבית וניהול משא ומתן חכם על תנאי השכר והאופציות",
            "בניית תוכנית קליטה ל-100 הימים הראשונים בתפקיד החדש כאפקטיביות מיידית",
            "שמירה על למידה מתמדת של מגמות שוק מובילות ב-2026"
          ],
          expectedImpact: "השתלבות מהירה ומוצלחת בתפקיד ניהול המוצר החדש והוכחת ערך משמעותי."
        }
      ],
      marketOpportunities: [
        {
          id: "demo-job-1",
          title: "Senior Product Manager - AI Platform",
          company: "InnovateTech Israel",
          location: "תל אביב - יפו (Tel Aviv)",
          url: "https://www.linkedin.com/jobs",
          description: "מחפשים מנהל מוצר בכיר להובלת פלטפורמת ה-AI החדשה שלנו. אחריות על הגדרת החזון, כתיבת PRD, ועבודה עם צוותי מו\"פ מתקדמים.",
          seniority: "Senior",
          industry: "High-Tech / AI",
          jobType: "Full-Time",
          datePosted: "היום",
          sourceSite: "LinkedIn",
          salaryRange: { min: 32000, max: 42000, currency: "ILS" },
          technologies: ["AI/ML", "Python", "SAAS", "Agile"],
          matchScore: 94,
          matchDetails: [
            "התאמה מעולה לניסיון המוצר מבוסס ה-AI שלכם",
            "הרצון של החברה בניסיון SaaS מוכח תואם במדויק לרקע שלך",
            "התאמת שכר מעולה לציפיות של רמת Senior"
          ],
          missingSkills: ["Python (בסיסי)"],
          matchAnalysis: { skillsScore: 92, experienceScore: 95, seniorityScore: 95 }
        },
        {
          id: "demo-job-2",
          title: "Product Leader - SaaS Systems",
          company: "CloudScale Systems",
          location: "הרצליה פיתוח (Herzliya)",
          url: "https://www.drushim.co.il",
          description: "הובלת מוצרי ענן מורכבים במודל B2B SaaS. עבודה מול לקוחות גלובליים וצוותי פיתוח מהירים.",
          seniority: "Lead / Manager",
          industry: "Enterprise Software",
          jobType: "Hybrid",
          datePosted: "לפני יומיים",
          sourceSite: "Drushim",
          salaryRange: { min: 28000, max: 36000, currency: "ILS" },
          technologies: ["SaaS", "Cloud Infrastructure", "B2B Analytics"],
          matchScore: 88,
          matchDetails: [
            "התמחות חזקה במודל B2B SaaS התואמת את הפרויקטים הקודמים שלך",
            "דרישה למיומנות ניתוח נתונים (Tableau/SQL) תואמת במלואה"
          ],
          missingSkills: ["B2B Sales Cycle"],
          matchAnalysis: { skillsScore: 85, experienceScore: 90, seniorityScore: 90 }
        }
      ],
      guidelines: [
        "דגש על הישגים מספריים: במקום לתאר משימות שעשית, תאר את האימפקט (למשל, שיפור ARR ב-15%)",
        "התאמה אישית של קורות החיים לכל משרה על ידי שימוש במילות מפתח מדויקות מהדרישות",
        "הכנה קפדנית לראיונות בנושאי Product Sense, אסטרטגיה ופתרון בעיות מעשיות"
      ],
      questions: [
        {
          question: "ספר לי על מוצר שהובלת מקצה לקצה והיית צריך לקחת החלטה קשה מבוססת נתונים שעמדה בניגוד לדעת הפיתוח. איך פעלת?",
          reason: "שאלה זו בוחנת את יכולת ההתמודדות שלך עם התנגדויות, שכנוע מבוסס נתונים ותקשורת בין-אישית מול ממשקים מורכבים."
        },
        {
          question: "איך היית מעצב מחדש את תהליך ה-Onboarding של אפליקציה מורכבת כדי להעלות את ה-Retention ב-15% תוך רבעון אחד?",
          reason: "שאלה זו נועדה לוודא שיש לך כישורים אנליטיים חזקים ויכולת חשיבה מתודית שיטתית לפתרון בעיות מוצר נפוצות."
        }
      ]
    } : {
      roleTitle: "Senior Product Manager",
      refinedResume: `Accomplished and growth-driven Senior Product Manager / Career Architect with 5+ years of experience leading cross-functional teams to build and scale B2B/B2C SaaS and AI-driven products.
Proven track record of defining product strategy, crafting comprehensive PRDs, and driving business growth through metrics-backed methodologies.
Expertise in user behavior analysis, onboarding optimization, and driving cross-functional alignment across engineering, design, and growth marketing.

💼 Highlights of Impact:
- Spearheaded the end-to-end product life cycle of an AI analytics suite, driving 35% growth in ARR.
- Designed and launched 3 highly complex digital products serving millions of users globally.
- Implemented core user-retention experiments, achieving a 20% increase in Day-30 retention rate.`,
      differentiators: [
        "Proven execution and business growth of complex, high-impact AI/ML and SaaS products in fast-paced tech hubs.",
        "Metrics-driven and analytical approach to backlog prioritization, product strategy, and continuous growth experiments.",
        "Excellent communication and cross-functional leadership, aligning engineering, product marketing, and design teams seamlessly."
      ],
      extractedSkills: [
        "Product Strategy", "SaaS Development", "AI/ML Integration", "Data Analysis", "Roadmapping", "PRD Design", "SQL & Tableau", "A/B Testing", "Agile Methodologies"
      ],
      growthRoadmap: [
        {
          phase: "Phase 1: Immediate Action (Months 1-3)",
          actions: [
            "Revamp your resume and LinkedIn profile to focus on metrics-driven, high-impact statements.",
            "Target active networking channels and build relationships with hiring managers in top tier tech companies in Tel Aviv & Herzliya.",
            "Solidify artificial intelligence skills such as prompt engineering and LLM integrations."
          ],
          expectedImpact: "Substantially increase job application response rate and secure initial phone screenings."
        },
        {
          phase: "Phase 2: Short-term Focus (Months 4-6)",
          actions: [
            "Engage actively in the Israeli Product Management scene by attending prominent meetups and forums.",
            "Practice structured interview simulations focusing on product-sense, estimation, and analytical questions.",
            "Construct a professional product portfolio highlighting a real-world case study or product tear-down."
          ],
          expectedImpact: "Successfully proceed through home assessments and technical rounds at target organizations."
        },
        {
          phase: "Phase 3: Long-term Growth (Months 6-12)",
          actions: [
            "Evaluate and negotiate competitive offers emphasizing long-term equity, bonuses, and professional scope.",
            "Create a structured 30-60-90 day onboard plan for immediate impact at your new role.",
            "Establish high standards of metrics observation and mentorship inside your new team."
          ],
          expectedImpact: "A smooth onboarding transition, fast organizational integration, and proven immediate value."
        }
      ],
      marketOpportunities: [
        {
          id: "demo-job-1",
          title: "Senior Product Manager - AI Platform",
          company: "InnovateTech Israel",
          location: "Tel Aviv-Yafo (Hybrid)",
          url: "https://www.linkedin.com/jobs",
          description: "Looking for a Senior Product Manager to lead our newly launched AI Core team. You will be responsible for defining the product vision, roadmap, and collaborating with top AI researchers.",
          seniority: "Senior",
          industry: "High-Tech / AI",
          jobType: "Full-Time",
          datePosted: "Today",
          sourceSite: "LinkedIn",
          salaryRange: { min: 32000, max: 42000, currency: "ILS" },
          technologies: ["AI/ML", "Python", "SAAS", "Agile"],
          matchScore: 94,
          matchDetails: [
            "Perfect match for your background in AI and SaaS.",
            "Demonstrated alignment with metrics-driven product strategy requirements.",
            "Highly competitive salary range matching a Senior PM's expectations."
          ],
          missingSkills: ["Python (basic familiarity)"],
          matchAnalysis: { skillsScore: 92, experienceScore: 95, seniorityScore: 95 }
        },
        {
          id: "demo-job-2",
          title: "Product Leader - SaaS Systems",
          company: "CloudScale Systems",
          location: "Herzliya Pituach (Hybrid)",
          url: "https://www.drushim.co.il",
          description: "Scale high-performance Cloud products using B2B SaaS models. Work directly with enterprise global customers.",
          seniority: "Lead / Manager",
          industry: "Enterprise Software",
          jobType: "Hybrid",
          datePosted: "2 days ago",
          sourceSite: "Drushim",
          salaryRange: { min: 28000, max: 36000, currency: "ILS" },
          technologies: ["SaaS", "Cloud Infrastructure", "B2B Analytics"],
          matchScore: 88,
          matchDetails: [
            "Strong alignment with B2B SaaS business models from your previous products.",
            "Strong matched requirement for advanced analytics and SQL expertise."
          ],
          missingSkills: ["B2B Sales Cycle"],
          matchAnalysis: { skillsScore: 85, experienceScore: 90, seniorityScore: 90 }
        }
      ],
      guidelines: [
        "Quantify your accomplishments: Instead of describing list of duties, focus on metrics (e.g., improved ARR by 15%).",
        "Tailor your applications: Incorporate specific structural keywords from targeted descriptions.",
        "Study structured PM frameworks: Specifically practice Product Sense, Metrics, Execution and Architecture/System design questions."
      ],
      questions: [
        {
          question: "Tell me about a time you had to make a difficult, data-driven product decision which went against the engineering team's intuition. How did you handle it?",
          reason: "This question evaluates your capability to manage cross-functional friction, communicate with data, and build professional alignment."
        },
        {
          question: "How would you redesign the onboarding flow of a SaaS product to increase user activation by 15% within a single quarter?",
          reason: "This question explores your understanding of growth funnels, experiment prioritization, and analytical problem-solving methodologies."
        }
      ]
    };

    setAlignmentData(sampleData);
    setHasAnalyzed(true);
    setReflectionState("insights");
    setAnalysisError(null);
  };

  const handleStartAnalysis = () => {
    if (!experience) {
      setAnalysisError(
        isHebrew ? "אנא הזן תיאור ניסיון קודם" : "Please enter your experience",
      );
      return;
    }
    analyzeWithAI();
  };

  const renderScreen = () => {
    switch (activeTab) {
      case Tab.Explore:
        return (
          <motion.div
            key="explore"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10"
          >
            <div className="space-y-4">
              <h1
                className="text-3xl md:text-5xl font-bold tracking-tight text-stone-900 dark:text-white leading-tight"
                dangerouslySetInnerHTML={{ __html: t("explore.heading") }}
              />
              <p className="text-lg md:text-xl text-stone-500 dark:text-stone-400 leading-relaxed max-w-lg">
                {t("explore.subheading")}
              </p>
            </div>

            <div className="space-y-8 bg-white dark:bg-stone-900 p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-stone-100 dark:border-stone-800">
              <div className="space-y-4">
                <label
                  htmlFor="user-name"
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  {isHebrew ? "שם מלא" : "Your name"}
                </label>
                <input
                  id="user-name"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={t("explore.namePlaceholder")}
                  className="w-full bg-transparent border-b border-stone-200 dark:border-stone-800 py-3 text-lg focus:border-stone-900 dark:focus:border-amber-400 outline-none transition-colors dark:text-white"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="experience-input"
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {isHebrew ? "ניסיון מקצועי" : "Experience / Resume"}
                  </label>
                  <input
                    id="experience-file"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.docx"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtracting}
                    aria-label={
                      isHebrew ? "העלאת קורות חיים" : "Upload resume PDF"
                    }
                    className="text-[10px] bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-full uppercase font-black text-stone-500 dark:text-stone-400 flex items-center gap-2 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all disabled:opacity-50 border border-stone-200 dark:border-stone-700 shadow-sm"
                  >
                    {isExtracting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Infinity,
                          duration: 1,
                          ease: "linear",
                        }}
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                      </motion.div>
                    ) : (
                      <Upload className="w-2.5 h-2.5" />
                    )}
                    <span className="tracking-widest">
                      {isExtracting
                        ? isHebrew
                          ? "מחלץ טקסט..."
                          : "Extracting..."
                        : isHebrew
                          ? "העלאת קובץ"
                          : "Upload PDF"}
                    </span>
                  </button>
                </div>
                {uploadSuccess && uploadedFileName && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-950/45 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2.5 shadow-sm"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>
                      {isHebrew ? (
                        <>
                          חולץ בהצלחה: קובץ קורות החיים <strong className="font-semibold text-stone-900 dark:text-emerald-200">"{uploadedFileName}"</strong> נקלט במערכת והועבר לניתוח.
                        </>
                      ) : (
                        <>
                          Successfully extracted: Resume <strong className="font-semibold text-stone-950 dark:text-white">"{uploadedFileName}"</strong> is loaded and sent for AI analysis.
                        </>
                      )}
                    </span>
                  </motion.div>
                )}
                <div className="relative group">
                  <textarea
                    id="experience-input"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder={t("explore.describePlaceholder")}
                    className="w-full bg-stone-50 dark:bg-stone-950/50 rounded-[1.5rem] p-8 h-48 text-stone-700 dark:text-stone-300 focus:ring-2 focus:ring-stone-900 dark:focus:ring-amber-400 outline-none transition-all resize-none leading-relaxed border border-transparent dark:border-stone-800"
                  />
                  {experience && (
                    <button
                      onClick={() => setExperience("")}
                      className="absolute top-4 right-4 p-2 bg-white/50 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    >
                      <X className="w-4 h-4 text-stone-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* ADVANCED JOB FILTERING COLLAPSIBLE ACCORDION */}
              <div className="border border-stone-100 dark:border-stone-800 rounded-2xl overflow-hidden bg-stone-50/50 dark:bg-stone-950/20">
                <button
                  type="button"
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  className="w-full flex items-center justify-between p-6 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors text-left font-black tracking-wider uppercase text-stone-600 dark:text-stone-350"
                >
                  <div className="flex items-center gap-3">
                    <Sliders className="w-5 h-5 text-stone-500 dark:text-amber-400" />
                    <span className="text-xs md:text-sm font-black tracking-widest text-stone-850 dark:text-white">
                      {isHebrew ? "הגדרות סינון משרות מתקדמות • ADVANCED JOB FILTERING" : "ADVANCED JOB FILTERING"}
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: isFiltersOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-stone-400" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {isFiltersOpen && (
                    <motion.div
                      key="advanced-filters-panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden border-t border-stone-100 dark:border-stone-800"
                    >
                      <div className="p-8 space-y-8 bg-stone-50/20 dark:bg-stone-950/30">
                        {/* Target Role Field */}
                        <div className="space-y-4">
                          <label
                            htmlFor="target-role"
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400"
                          >
                            <Briefcase className="w-3.5 h-3.5" />
                            {isHebrew ? "הגדרת תפקיד יעד / מילות מפתח" : "Target Role / Keywords"}
                          </label>
                          <input
                            id="target-role"
                            type="text"
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="e.g. Senior Product Manager"
                            className="w-full bg-transparent border-b border-stone-200 dark:border-stone-800 py-3 text-lg focus:border-stone-900 dark:focus:border-amber-400 outline-none transition-colors dark:text-white"
                          />
                        </div>

                        {/* Location, Environment, Seniority Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="space-y-4">
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                              <Globe className="w-3.5 h-3.5" />
                              {isHebrew ? "מיקום" : "Location"}
                            </label>
                            <select
                              value={selectedLocation}
                              onChange={(e) => setSelectedLocation(e.target.value)}
                              className="w-full bg-transparent border-b border-stone-200 dark:border-stone-800 py-3 focus:border-stone-900 dark:focus:border-amber-400 outline-none transition-colors appearance-none font-medium dark:text-white cursor-pointer"
                            >
                              <option value="Israel">{isHebrew ? "כל הארץ (Israel)" : "All Israel"}</option>
                              <option value="Tel Aviv & Center">{isHebrew ? "תל אביב והמרכז" : "Tel Aviv & Center"}</option>
                              <option value="Jerusalem">{isHebrew ? "ירושלים והסביבה" : "Jerusalem & Area"}</option>
                              <option value="Beer Sheva & South">{isHebrew ? "באר שבע והדרום" : "Beer Sheva & South"}</option>
                              <option value="Haifa & North">{isHebrew ? "חיפה והצפון" : "Haifa & North"}</option>
                              <option value="Shfela">{isHebrew ? "שפלה" : "Shfela (Rehovot/Rishon)"}</option>
                              <option value="Eilat">{isHebrew ? "אילת" : "Eilat"}</option>
                              <option value="United States">{isHebrew ? 'ארה"ב' : "United States"}</option>
                              <option value="Germany">{isHebrew ? 'גרמניה' : "Germany"}</option>
                              <option value="Remote">{isHebrew ? "עבודה מרחוק" : "Remote Work"}</option>
                            </select>
                          </div>
                          
                          <div className="space-y-4">
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                              <Layout className="w-3.5 h-3.5" />
                              {isHebrew ? "סביבת עבודה" : "Environment"}
                            </label>
                            <select
                              value={environment}
                              onChange={(e) => setEnvironment(e.target.value)}
                              className="w-full bg-transparent border-b border-stone-200 dark:border-stone-800 py-3 focus:border-stone-900 dark:focus:border-amber-400 outline-none transition-colors appearance-none font-medium dark:text-white cursor-pointer"
                            >
                              <option value="Remote">{t("explore.remote")}</option>
                              <option value="Hybrid">{t("explore.hybrid")}</option>
                              <option value="On-site">{t("explore.onSite")}</option>
                            </select>
                          </div>

                          <div className="space-y-4">
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                              <History className="w-3.5 h-3.5" />
                              {isHebrew ? "רמת בכירות" : "Seniority"}
                            </label>
                            <select
                              value={seniority}
                              onChange={(e) => setSeniority(e.target.value)}
                              className="w-full bg-transparent border-b border-stone-200 dark:border-stone-800 py-3 focus:border-stone-900 dark:focus:border-amber-400 outline-none transition-colors appearance-none font-medium dark:text-white cursor-pointer"
                            >
                              <option value="Junior">{t("explore.junior")}</option>
                              <option value="Mid-level">{t("explore.mid")}</option>
                              <option value="Senior">{t("explore.senior")}</option>
                              <option value="Lead / Manager">{isHebrew ? "ראש צוות / מנהל" : "Lead / Manager"}</option>
                            </select>
                          </div>
                        </div>

                        {/* Salary Settings */}
                        <div className="space-y-4 bg-stone-150/40 dark:bg-stone-950/40 p-6 rounded-2xl border border-stone-200/40 dark:border-stone-800/40">
                          <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                            <Coins className="w-4 h-4 text-amber-500" />
                            {isHebrew ? "ציפיות שכר חודשיות (ברוטו) • SALARY SETTINGS" : "Expected Monthly Base Salary • Salary Settings"}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-400 uppercase">{isHebrew ? "שכר מינימום" : "Min Salary"}</label>
                              <input
                                type="number"
                                value={minSalary}
                                onChange={(e) => setMinSalary(e.target.value)}
                                placeholder="e.g. 25000"
                                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2 text-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-amber-400 transition"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-400 uppercase">{isHebrew ? "שכר מקסימום" : "Max Salary"}</label>
                              <input
                                type="number"
                                value={maxSalary}
                                onChange={(e) => setMaxSalary(e.target.value)}
                                placeholder="e.g. 50000"
                                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2 text-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-amber-400 transition"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-400 uppercase">{isHebrew ? "מטבע שכר" : "Currency"}</label>
                              <select
                                value={salaryCurrency}
                                onChange={(e) => setSalaryCurrency(e.target.value)}
                                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2 text-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-amber-400 transition cursor-pointer"
                              >
                                <option value="ILS">ILS (₪)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Inline Update Button inside Advanced Filter accordion */}
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => analyzeWithAI()}
                            disabled={isAnalyzing || isExtracting}
                            className="flex items-center gap-2 px-6 h-12 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-900 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-black/15 disabled:opacity-50"
                          >
                            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
                            {isAnalyzing 
                              ? (isHebrew ? "מעדכן תוצאות..." : "Updating...") 
                              : (isHebrew ? "עדכן תוצאות לפי הפילטרים" : "Update Results")}
                          </button>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing || isExtracting}
                className="w-full h-16 md:h-20 bg-stone-900 text-white rounded-2xl md:rounded-[1.5rem] font-black text-lg md:text-xl hover:shadow-2xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50 disabled:translate-y-0 group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-stone-800 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <div className="relative flex items-center gap-4">
                  {isAnalyzing || isExtracting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                    >
                      <RefreshCw className="w-7 h-7" />
                    </motion.div>
                  ) : (
                    <Sparkles className="w-7 h-7 text-amber-400 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="uppercase tracking-[0.1em]">
                    {isExtracting
                      ? isHebrew
                        ? "מנתח קובץ..."
                        : "Processing File..."
                      : isAnalyzing
                        ? t("common.analyzing")
                        : t("explore.cta")}
                  </span>
                </div>
              </button>
            </div>
          </motion.div>
        );

      case Tab.Growth:
        if (!hasAnalyzed && reflectionState !== "thinking") {
          return (
            <motion.div
              key="no-analysis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="w-24 h-24 bg-stone-100 dark:bg-stone-900 rounded-full flex items-center justify-center">
                <Brain className="w-12 h-12 text-stone-300 dark:text-stone-700" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight dark:text-white">
                  {isHebrew ? "אסטרטגיית צמיחה אישית" : "Growth Strategy Hub"}
                </h2>
                <p className="text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
                  {isHebrew
                    ? "השתמש בטאב Explore כדי להזין את הניסיון שלך ולקבל תובנות קריירה מותאמות אישית."
                    : "Connect your experience in the Explore tab to unlock your 2026 growth roadmap."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => handleTabChange(Tab.Explore)}
                  className="px-10 h-14 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-900 rounded-[1.25rem] font-bold hover:shadow-lg transition-all"
                >
                  {t("reflections.getStarted")}
                </button>
                <button
                  onClick={loadSampleData}
                  className="px-6 h-14 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-[1.25rem] font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  {isHebrew ? "הצג אסטרטגיה לדוגמה" : "View Sample Roadmap"}
                </button>
              </div>
            </motion.div>
          );
        }

        if (reflectionState === "thinking") {
          return (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4"
            >
              {analysisError ? (
                <div className="space-y-8 bg-white dark:bg-stone-900 p-8 md:p-12 rounded-3xl md:rounded-[3rem] border border-stone-100 dark:border-stone-800 shadow-xl max-w-md w-full">
                  <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-2xl font-bold text-stone-900 dark:text-white">
                      {isHebrew ? "הניתוח נתקל בקושי" : "Analysis Interrupted"}
                    </h2>
                    <p className="text-stone-500 dark:text-stone-400 leading-relaxed text-sm">
                      {analysisError}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <button
                      onClick={() => analyzeWithAI()}
                      className="w-full h-14 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-900 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-transform"
                    >
                      {t("common.retry")}
                    </button>
                    {(analysisError.toLowerCase().includes("quota") || analysisError.includes("מכסת") || analysisError.includes("מכסה")) && (
                      <button
                        onClick={loadSampleData}
                        className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white dark:text-stone-900 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
                      >
                        <Sparkles className="w-5 h-5" />
                        {isHebrew ? "השתמש בנתוני דוגמה (מצב הדגמה)" : "Use Sample Data (Demo Mode)"}
                      </button>
                    )}
                    <button
                      onClick={() => handleTabChange(Tab.Explore)}
                      className="w-full h-14 border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 rounded-2xl font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                    >
                      {t("common.backToEdit")}
                    </button>
                  </div>
                </div>
              ) : (
                <LoadingSequence isHebrew={isHebrew} />
              )}
            </motion.div>
          );
        }

        if (reflectionState === "insights") {
          return (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pb-40 space-y-16 md:space-y-24"
            >
              {alignmentData?.isFallback && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 bg-amber-50/70 dark:bg-amber-950/20 rounded-3xl border border-amber-200/50 dark:border-amber-900/35 text-stone-800 dark:text-amber-200/90 text-sm leading-relaxed flex flex-col md:flex-row items-start gap-4 shadow-sm max-w-4xl mx-auto"
                >
                  <span className="text-2xl shrink-0 mt-0.5" role="img" aria-label="shield">🛡️</span>
                  <div className="space-y-2 flex-grow">
                    <h4 className="font-bold text-stone-900 dark:text-amber-300">
                      {isHebrew 
                        ? (alignmentData?.fallbackReason === "quota" ? "מצב התאמה וניתוח חכם (גיבוי מקומי - עומס/מכסה)" : "מצב התאמה וניתוח חכם (גיבוי מקומי - שגיאת עיבוד זמנית)")
                        : (alignmentData?.fallbackReason === "quota" ? "Smart Local Match Mode (Fallback - Quota Exceeded)" : "Smart Local Match Mode (Fallback - Process Error)")}
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-amber-400/80 leading-relaxed">
                      {isHebrew ? (
                        alignmentData?.fallbackReason === "quota" ? (
                          <>
                            עקב עומס זמני או מגבלת מכסה בשרתי ה-API של Gemini, הפעלנו את מנוע הניתוח המקומי. כל הנתונים, ההתאמות ומסלולי הקריירה מוצגים בצורה מותאמת אישית מלאה לפי הפרופיל שלך! אם כבר הגדלת את המכסה או הגדרת חיוב, אנא ודא שמפתח ה-API שלך מעודכן ומותקן בהגדרות המערכת.
                          </>
                        ) : (
                          <>
                            חלה שגיאה זמנית בעיבוד הנתונים משרתי Gemini או שמפתח ה-API שהוזן אינו תקין/לא מוגדר. על מנת לשמור על רציפות עבודה מושלמת, הפעלנו את מנוע הניתוח המקומי והחכם שלנו לניתוח והתאמת קורות החיים שלך! נסה לבצע את הניתוח שוב, או ודא שמפתח ה-API שלך מוגדר בהגדרות בסרגל הכלים.
                          </>
                        )
                      ) : (
                        alignmentData?.fallbackReason === "quota" ? (
                          <>
                            Due to temporary load or quota limits on Gemini server APIs, specialized local matching model has been activated. All analysis details, roadmap and matching remain fully customized for your profile! If you've upgraded your quota/billing, please make sure your API key in settings is properly updated.
                          </>
                        ) : (
                          <>
                            We encountered a temporary processing error or communication issue with the Gemini APIs (or the API key is unconfigured). To keep your workflow fluid, our custom smart local analyzer was activated! Please try running the analysis again or verify your API details in your dashboard configurations.
                          </>
                        )
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/30 dark:border-amber-900/10 mt-2">
                      <span className="text-[11px] text-stone-500 dark:text-stone-400">
                        {isHebrew ? "מקור השגיאה:" : "Source of Fallback:"} <strong className="font-semibold text-stone-700 dark:text-stone-300">{alignmentData?.fallbackReason || "general"}</strong>
                      </span>
                      <button
                        onClick={() => analyzeWithAI()}
                        className="text-xs bg-amber-500/20 hover:bg-amber-500/30 dark:bg-amber-400/10 dark:hover:bg-amber-400/20 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full font-bold transition-all ml-auto cursor-pointer"
                      >
                        {isHebrew ? "🔄 נסה להתחבר מחדש ל-API של Gemini" : "🔄 Re-try Gemini API Connect"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div className="space-y-2">
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight dark:text-white">
                    {t("insights.yourRoadmap")}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-stone-500 dark:text-stone-400 text-sm md:text-base">
                    <Briefcase className="w-4 h-4" />
                    <span className="font-medium">
                      {alignmentData?.roleTitle}
                    </span>
                    <span className="text-stone-300 dark:text-stone-700">
                      •
                    </span>
                    <Globe className="w-4 h-4" />
                    <span className="font-medium">{selectedLocation}</span>
                  </div>
                </div>
                <div className="bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-900 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-3 font-bold shadow-lg shadow-black/10 w-fit">
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
                  {isHebrew ? "אסטרטגיית צמיחה" : "GROWTH STRATEGY"}
                </div>
              </header>

              {alignmentData?.growthRoadmap && (
                <GrowthRoadmap roadmap={alignmentData.growthRoadmap} isHebrew={isHebrew} />
              )}

              {alignmentData?.extractedSkills && (
                <section className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isHebrew ? "מיומנויות שזוהו" : "Identified Skills"}
                  </h3>
                  <div className="flex flex-wrap gap-2 md:gap-3">
                    {alignmentData?.extractedSkills?.map((skill, i) => (
                      <span
                        key={i}
                        className="px-3 md:px-4 py-1.5 md:py-2 bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold text-stone-600 dark:text-stone-300 hover:border-amber-400 transition-colors shadow-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {alignmentData?.refinedResume && (
                <section className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    {t("insights.refinedResume")}
                  </h3>
                  <div className="relative group">
                    <div className="p-6 md:p-10 bg-stone-900 dark:bg-stone-800 text-stone-50 rounded-2xl md:rounded-[2.5rem] leading-relaxed text-base md:text-lg border-l-4 md:border-l-8 border-amber-400 shadow-2xl whitespace-pre-wrap">
                      {alignmentData?.refinedResume && (
                        <div className="whitespace-pre-wrap">
                          {alignmentData.refinedResume}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleCopyResume}
                      className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-3 rounded-2xl backdrop-blur transition-all flex items-center gap-2"
                    >
                      {showCopyTooltip ? (
                        <span className="text-[10px] font-bold text-amber-300 uppercase">
                          {t("insights.copySuccess")}
                        </span>
                      ) : (
                        <History className="w-5 h-5 text-stone-300" />
                      )}
                    </button>
                  </div>
                </section>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-8">
                <section className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 border-b border-stone-100 pb-3 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    {t("common.keyDifferentiators")}
                  </h3>
                  <div className="space-y-4">
                    {alignmentData?.differentiators?.map((diff, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 md:p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl md:rounded-[1.5rem] flex gap-4 items-start shadow-sm"
                      >
                        <div className="mt-1.5 w-2 h-2 bg-stone-900 dark:bg-amber-400 rounded-full flex-shrink-0" />
                        <p className="font-semibold text-stone-800 dark:text-stone-200 leading-snug text-sm md:text-base">
                          {diff}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 border-b border-stone-100 pb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {t("insights.guidelines")}
                  </h3>
                  <div className="space-y-4">
                    {alignmentData?.guidelines?.map((guide, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 md:p-6 bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl md:rounded-[1.5rem] flex gap-4 items-start"
                      >
                        <span className="text-xl font-black text-stone-200 dark:text-stone-700">
                          {i + 1}
                        </span>
                        <p className="text-xs md:text-sm text-stone-600 dark:text-stone-300 font-medium leading-relaxed">
                          {guide}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-stone-100 dark:border-stone-800 pb-6">
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 flex items-center gap-2">
                      <MapIcon className="w-4 h-4" />
                      {t("insights.marketOpportunities")}
                    </h3>
                    <p className="text-2xl font-black text-stone-900 dark:text-white leading-tight">
                      {isHebrew ? "הזדמנויות שוק חמות" : "Deep Market Matching"}
                    </p>
                  </div>
                  
                  {currentUser ? (
                    <button 
                      onClick={handleSaveAlert}
                      className="group flex items-center gap-3 px-6 h-12 bg-amber-400 text-stone-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-400/20"
                    >
                      <BellRing className="w-4 h-4 group-hover:animate-bounce" />
                      {isHebrew ? "הירשם להתראות בזמן אמת" : "Subscribe to Real-time Alerts"}
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-stone-100 dark:bg-stone-800 rounded-xl text-[10px] font-bold text-stone-400">
                      {isHebrew ? "התחבר כדי להירשם להתראות" : "Sign in to subscribe to alerts"}
                    </div>
                  )}
                </div>

                {((alignmentData as any)?.isCachedFallback || (alignmentData as any)?.isFallback) && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-3xl text-sm md:text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-medium leading-relaxed"
                  >
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      <span>
                        {isHebrew 
                          ? "מנוע הגיבוי המקומי פעיל: מציג משרות מתוך סינכרון מאגר הנתונים המאובטח של JobBoost AI." 
                          : "Local Caching Active: Serving bulletproof matching results from JobBoost's offline snapshots database."}
                      </span>
                    </div>
                    <div className="text-[10px] uppercase font-black tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-md shrink-0">
                      {isHebrew ? "מצב גיבוי" : "Backup Mode"}
                    </div>
                  </motion.div>
                )}

                {/* Search Filter Summary block with Update Results CTA */}
                <div className="bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-850 rounded-[2rem] p-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                      {isHebrew ? "הגדרות חיפוש פעילות • ACTIVE SEARCH PARAMETERS" : "ACTIVE SEARCH PARAMETERS"}
                    </p>
                    <div className="flex flex-wrap gap-2 text-[11px] font-bold text-stone-600 dark:text-stone-350">
                      <span className="px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 rounded-lg flex items-center gap-1 shadow-sm">
                        💼 {jobDescription || (isHebrew ? "מנהל מוצר / מוביל טכנולוגי" : "Product Manager")}
                      </span>
                      <span className="px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 rounded-lg flex items-center gap-1 shadow-sm">
                        📍 {selectedLocation}
                      </span>
                      <span className="px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 rounded-lg flex items-center gap-1 shadow-sm">
                        📈 {seniority}
                      </span>
                      <span className="px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 rounded-lg flex items-center gap-1 shadow-sm">
                        🏢 {environment}
                      </span>
                      <span className="px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 rounded-lg flex items-center gap-1 shadow-sm">
                        💰 {minSalary} - {maxSalary} {salaryCurrency}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => analyzeWithAI()}
                    disabled={isAnalyzing}
                    className="h-12 px-6 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-900 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
                    {isAnalyzing 
                      ? (isHebrew ? "סורק ומעדכן..." : "Updating...") 
                      : (isHebrew ? "עדכן תוצאות" : "Update Results")}
                  </button>
                </div>

                <div className="flex flex-col gap-6 w-full">
                      <div className="relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 dark:text-stone-600" />
                        <input
                          type="text"
                          placeholder={
                            isHebrew ? "חפש בתפקיד, חברה או מיקום..." : "Search by title, company, or location..."
                          }
                          value={jobFilterSearch}
                          onChange={(e) => setJobFilterSearch(e.target.value)}
                          className="bg-white dark:bg-stone-900 border-2 border-stone-100 dark:border-stone-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-stone-900 dark:focus:border-amber-400 outline-none w-full dark:text-white transition-all shadow-sm"
                        />
                      </div>

                      <div className="flex flex-wrap gap-8 items-center bg-stone-50/50 dark:bg-stone-800/20 p-6 md:p-8 rounded-[2rem] border border-stone-100 dark:border-stone-800">
                        <div className="space-y-4 w-full">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 flex items-center gap-2">
                             {isHebrew ? "בכירות" : "Seniority"}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const levels = Array.from(new Set((alignmentData?.marketOpportunities || []).map(op => op.seniority).filter(Boolean)));
                              return (
                                <>
                                  <button
                                    onClick={() => setJobFilterSeniorities([])}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                                      jobFilterSeniorities.length === 0
                                        ? "bg-stone-900 text-white border-stone-900 dark:bg-amber-400 dark:text-stone-900 dark:border-amber-400"
                                        : "border-stone-100 dark:border-stone-800 text-stone-400 hover:border-stone-200"
                                    }`}
                                  >
                                    {isHebrew ? "הכל" : "All"}
                                  </button>
                                  {levels.map(level => (
                                    <button
                                      key={level}
                                      onClick={() => {
                                        setJobFilterSeniorities(prev => 
                                          prev.includes(level) 
                                            ? prev.filter(l => l !== level) 
                                            : [...prev, level]
                                        );
                                      }}
                                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                                        jobFilterSeniorities.includes(level)
                                          ? "bg-stone-900 text-white border-stone-900 dark:bg-amber-400 dark:text-stone-900 dark:border-amber-400"
                                          : "border-stone-100 dark:border-stone-800 text-stone-400 hover:border-stone-200"
                                      }`}
                                    >
                                      {level}
                                    </button>
                                  ))}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="space-y-4 w-full">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 flex items-center gap-2">
                             {isHebrew ? "תעשייה" : "Industry"}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const industries = Array.from(new Set((alignmentData?.marketOpportunities || []).map(op => op.industry).filter(Boolean)));
                              return (
                                <>
                                  <button
                                    onClick={() => setJobFilterIndustries([])}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                                      jobFilterIndustries.length === 0
                                        ? "bg-stone-900 text-white border-stone-900 dark:bg-amber-400 dark:text-stone-900 dark:border-amber-400"
                                        : "border-stone-100 dark:border-stone-800 text-stone-400 hover:border-stone-200"
                                    }`}
                                  >
                                    {isHebrew ? "הכל" : "All"}
                                  </button>
                                  {industries.map(industry => (
                                    <button
                                      key={industry}
                                      onClick={() => {
                                        setJobFilterIndustries(prev => 
                                          prev.includes(industry) 
                                            ? prev.filter(i => i !== industry) 
                                            : [...prev, industry]
                                        );
                                      }}
                                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                                        jobFilterIndustries.includes(industry)
                                          ? "bg-stone-900 text-white border-stone-900 dark:bg-amber-400 dark:text-stone-900 dark:border-amber-400"
                                          : "border-stone-100 dark:border-stone-800 text-stone-400 hover:border-stone-200"
                                      }`}
                                    >
                                      {industry}
                                    </button>
                                  ))}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="space-y-4 w-full">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 flex items-center gap-2">
                             {isHebrew ? "טכנולוגיות" : "Technologies"}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const techs = Array.from(
                                new Set(
                                  (alignmentData?.marketOpportunities || []).flatMap(op => {
                                    const techsField = op.technologies as any;
                                    if (!techsField) return [];
                                    if (typeof techsField === "string") {
                                      return techsField.split(",").map((t: string) => t.trim()).filter(Boolean);
                                    }
                                    return Array.isArray(techsField) ? techsField : [];
                                  }).filter(Boolean)
                                )
                              );
                              return (
                                <>
                                  <button
                                    onClick={() => setJobFilterTechnologies([])}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                                      jobFilterTechnologies.length === 0
                                        ? "bg-stone-900 text-white border-stone-900 dark:bg-amber-400 dark:text-stone-900 dark:border-amber-400"
                                        : "border-stone-100 dark:border-stone-800 text-stone-400 hover:border-stone-200"
                                    }`}
                                  >
                                    {isHebrew ? "הכל" : "All"}
                                  </button>
                                  {techs.map(tech => (
                                    <button
                                      key={tech}
                                      onClick={() => {
                                        setJobFilterTechnologies(prev => 
                                          prev.includes(tech) 
                                            ? prev.filter(t => t !== tech) 
                                            : [...prev, tech]
                                        );
                                      }}
                                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                                        jobFilterTechnologies.includes(tech)
                                          ? "bg-stone-900 text-white border-stone-900 dark:bg-amber-400 dark:text-stone-900 dark:border-amber-400"
                                          : "border-stone-100 dark:border-stone-800 text-stone-400 hover:border-stone-200"
                                      }`}
                                    >
                                      {tech}
                                    </button>
                                  ))}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full items-end">
                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 flex items-center gap-2">
                              {isHebrew ? "שכר חודשי מינימלי" : "Min Monthly Salary"}
                            </label>
                            <div className="flex items-center gap-4">
                              <input
                                type="range"
                                min="0"
                                max="100000"
                                step="2000"
                                value={jobFilterMinSalary}
                                onChange={(e) => setJobFilterMinSalary(parseInt(e.target.value))}
                                className="w-full accent-amber-400"
                              />
                              <span className="text-sm font-bold w-24 tabular-nums dark:text-white">
                                {jobFilterMinSalary === 0 ? "—" : `${(jobFilterMinSalary).toLocaleString()} ₪`}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 flex items-center gap-2">
                              {isHebrew ? "מדד התאמה" : "Match Score"}
                            </label>
                            <div className="flex gap-1 justify-between">
                              {[0, 70, 80, 90].map(score => (
                                <button
                                  key={score}
                                  onClick={() => setJobFilterMinMatch(score)}
                                  className={`flex-1 h-12 rounded-xl text-[10px] font-black transition-all border-2 flex items-center justify-center ${
                                    jobFilterMinMatch === score
                                      ? "bg-stone-900 text-white border-stone-900 dark:bg-amber-400 dark:text-stone-900 dark:border-amber-400"
                                      : "border-stone-100 dark:border-stone-800 text-stone-400 hover:border-stone-200"
                                  }`}
                                >
                                  {score === 0 ? "—" : `${score}%+`}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {(jobFilterSearch || jobFilterSeniorities.length > 0 || jobFilterIndustries.length > 0 || jobFilterTechnologies.length > 0 || jobFilterMinSalary > 0 || jobFilterMinMatch > 0) && (
                          <div className="w-full pt-4 flex justify-end">
                            <button
                              onClick={() => {
                                setJobFilterSearch("");
                                setJobFilterSeniorities([]);
                                setJobFilterIndustries([]);
                                setJobFilterTechnologies([]);
                                setJobFilterMinSalary(0);
                                setJobFilterMinMatch(0);
                              }}
                              className="flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                              {isHebrew ? "נקה את כל המסננים" : "Clear All Filters"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                <div className="grid gap-6">
                  {(() => {
                    // 1. Loading State: Minimal, non-jarring layout shell
                    if (isAnalyzing) {
                      return (
                        <div className="space-y-6">
                          {[1, 2, 3].map((n) => (
                            <div key={n} className="animate-pulse bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 rounded-[2rem] p-6 md:p-8 space-y-4">
                              <div className="flex items-center gap-4 justify-between">
                                <div className="h-6 bg-stone-200 dark:bg-stone-800 rounded-lg w-2/3" />
                                <div className="h-8 bg-stone-200 dark:bg-stone-800 rounded-full w-24" />
                              </div>
                              <div className="h-4 bg-stone-150 dark:bg-stone-800 rounded-lg w-1/3" />
                              <div className="h-16 bg-stone-50 dark:bg-stone-800/50 rounded-2xl w-full" />
                            </div>
                          ))}
                        </div>
                      );
                    }

                    const filtered = (
                      alignmentData?.marketOpportunities || []
                    ).filter(
                      (op) => {
                        const techsField = op.technologies as any;
                        const safeTechs = Array.isArray(techsField) 
                          ? techsField 
                          : (typeof techsField === "string" 
                              ? techsField.split(",").map((t: string) => t.trim()).filter(Boolean) 
                              : []);
                        const searchStr = `${op.title} ${op.company} ${op.location} ${op.industry} ${safeTechs.join(" ")}`.toLowerCase();
                        const matchesSearch = searchStr.includes(jobFilterSearch.toLowerCase());
                        const matchesSeniority = jobFilterSeniorities.length === 0 || jobFilterSeniorities.includes(op.seniority);
                        const matchesIndustry = jobFilterIndustries.length === 0 || (op.industry && jobFilterIndustries.includes(op.industry));
                        const matchesTech = jobFilterTechnologies.length === 0 || safeTechs.some((t: string) => jobFilterTechnologies.includes(t));
                        const matchesSalary = jobFilterMinSalary === 0 || (op.salaryRange?.min !== undefined && op.salaryRange.min >= jobFilterMinSalary);
                        const matchesMatch = (op.matchScore || 0) >= jobFilterMinMatch;
                        
                        return matchesSearch && matchesSeniority && matchesIndustry && matchesTech && matchesSalary && matchesMatch;
                      }
                    );

                    // 3. Empty State: Authoritative Profile Optimization Guide instead of a dead-end
                    if (filtered.length === 0) {
                      return (
                        <div className="p-8 md:p-12 text-center bg-stone-50 dark:bg-stone-900/40 rounded-[2.5rem] border border-stone-150 dark:border-stone-800 space-y-6 max-w-2xl mx-auto">
                          <div className="w-16 h-16 bg-white dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
                            <Sparkles className="w-8 h-8 text-amber-500" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xl font-black dark:text-white leading-tight">
                              {isHebrew ? "שפר מועמדות וחשוף משרות חדשות" : "Unlock High-Matching Alignments"}
                            </h4>
                            <p className="text-stone-500 dark:text-stone-400 text-xs md:text-sm leading-relaxed">
                              {isHebrew
                                ? "לא נמצאו משרות התואמות לפעולות החיפוש הנוכחיות. להלן הנחיות אופטימיזציה קריירה מהירות עבורך:"
                                : "No current matches fit your thresholds perfectly. Let's perform these quick structural refinements to align your profile:"}
                            </p>
                          </div>
                          <div className="text-left space-y-3 max-w-md mx-auto">
                            <div className="flex gap-3 items-start bg-white dark:bg-stone-900/60 p-4 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm">
                              <span className="text-amber-500 font-bold">1.</span>
                              <p className="text-xs text-stone-600 dark:text-stone-300 font-medium leading-relaxed">
                                {isHebrew ? "העשר את רקע הניסיון בפרופיל האישי עם 3 טכנולוגיות מפתח נוספות מסעיף ה-Skills." : "Enrich your background with key technological skills inside your Profile Settings."}
                              </p>
                            </div>
                            <div className="flex gap-3 items-start bg-white dark:bg-stone-900/60 p-4 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm">
                              <span className="text-amber-500 font-bold">2.</span>
                              <p className="text-xs text-stone-600 dark:text-stone-300 font-medium leading-relaxed">
                                {isHebrew ? "שלב KPIs ומדדי הצלחה מספריים (כמו אחוז שיפור או ייעול תהליכים)." : "Incorporate active metric indicators (e.g. key performance indicators or cost-efficiency scores)."}
                              </p>
                            </div>
                            <div className="flex gap-3 items-start bg-white dark:bg-stone-900/60 p-4 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm">
                              <span className="text-amber-500 font-bold">3.</span>
                              <p className="text-xs text-stone-600 dark:text-stone-300 font-medium leading-relaxed">
                                {isHebrew ? "כוון את שכר המינום בפילטרים הגלובליים בצורה ריאלית ונקייה להרחבת ההצעות." : "Optimize global min salary benchmarks dynamically to match active market opportunities."}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Helper to detect generic/low-value top recruitment landing pages
                    const isGenericUrl = (url?: string) => {
                      if (!url) return true;
                      const lurl = url.toLowerCase();
                      return lurl.includes("linkedin.com/jobs") || 
                             lurl.includes("linkedin.com") || 
                             lurl.includes("drushim.co.il") || 
                             lurl.includes("alljobs.co.il") || 
                             lurl.includes("indeed.com") || 
                             lurl.includes("glassdoor.com") ||
                             lurl === "https://www.linkedin.com" ||
                             lurl === "https://linkedin.com" ||
                             /^https?:\/\/[^\/]+\/?$/.test(lurl);
                    };

                    return filtered.map((op, i) => {
                      const isExpanded = expandedJobId === op.id;
                      return (
                        <motion.div
                          key={op.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden group hover:border-stone-900 dark:hover:border-amber-400 hover:shadow-2xl transition-all cursor-pointer"
                          onClick={() => setExpandedJobId(isExpanded ? null : op.id)}
                        >
                          <div className="p-6 md:p-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="space-y-3 w-full">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                    <p className="font-black text-xl md:text-2xl leading-tight dark:text-white">
                                      {op.title}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                                      <span className="px-2 md:px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[9px] md:text-[10px] font-black rounded-full uppercase tracking-tighter shrink-0">
                                        {isHebrew ? "מאומת" : "Verified"}
                                      </span>
                                      {op.seniority && (
                                        <span className="px-2 md:px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-[9px] md:text-[10px] font-black rounded-full uppercase tracking-tighter shrink-0">
                                          {op.seniority}
                                        </span>
                                      )}
                                      {op.matchScore && (
                                        <div className="flex items-center gap-2 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-900 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm border border-black/10 dark:border-white/20">
                                          <div className="w-2.5 h-2.5 rounded-full bg-white dark:bg-stone-900 overflow-hidden relative">
                                            <div 
                                              className="absolute bottom-0 left-0 w-full bg-emerald-500 transition-all duration-1000"
                                              style={{ height: `${op.matchScore}%` }}
                                            />
                                          </div>
                                          {isHebrew ? "התאמה" : "Match"}{" "}
                                          {op.matchScore}%
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                    <p className="text-stone-500 dark:text-stone-400 font-bold text-sm md:text-lg">
                                      {op.company} • {op.location}
                                    </p>
                                    <span className="text-stone-300 dark:text-stone-700 hidden sm:inline">•</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                                      {op.industry}
                                    </span>
                                    <span className="text-stone-300 dark:text-stone-700 hidden sm:inline">•</span>
                                    <span className="text-[10px] font-bold text-emerald-500 tabular-nums">
                                      {op.salaryRange?.min?.toLocaleString() || "—"}-{op.salaryRange?.max?.toLocaleString() || "—"} {op.salaryRange?.currency || ""}
                                    </span>
                                    <span className="text-stone-300 dark:text-stone-700 hidden sm:inline">•</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                                      {op.jobType}
                                    </span>
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-stone-400">
                                    <span className="font-bold text-stone-500 dark:text-stone-300 uppercase tracking-tighter">
                                      {op.sourceSite}
                                    </span>
                                    <span>•</span>
                                    <span>{op.datePosted}</span>
                                  </div>
                                  
                                  {(() => {
                                    const techsField = op.technologies as any;
                                    const renderedTechs: string[] = Array.isArray(techsField) 
                                      ? techsField 
                                      : (typeof techsField === "string" 
                                          ? techsField.split(",").map((t: string) => t.trim()).filter(Boolean) 
                                          : []);
                                    return renderedTechs.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 pt-1">
                                        {renderedTechs.map((tech: string, idx: number) => (
                                          <span key={idx} className="text-[8px] font-medium px-2 py-0.5 bg-stone-50 dark:bg-stone-800/50 text-stone-400 border border-stone-100 dark:border-stone-800 rounded-md">
                                            {tech}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!currentUser) {
                                      signInWithGoogle();
                                      return;
                                    }
                                    await toggleJobLike(currentUser.uid, op);
                                  }}
                                  className={`p-3 rounded-xl border-2 transition-all ${
                                    likedJobIds.includes(generateJobId(op))
                                      ? "bg-amber-400 border-amber-400 text-stone-900" 
                                      : "bg-white dark:bg-stone-800 border-stone-100 dark:border-stone-800 text-stone-400 hover:border-amber-400"
                                  }`}
                                >
                                  <Heart className={`w-5 h-5 ${likedJobIds.includes(generateJobId(op)) ? "fill-current" : ""}`} />
                                </button>
                                
                                {op.url && (
                                  <a
                                    href={op.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 text-[10px] md:text-xs text-amber-600 dark:text-amber-400 hover:underline font-black uppercase tracking-widest whitespace-nowrap"
                                  >
                                    {isHebrew ? "קישור למשרה" : "Link to Job"}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReflectionState("interviewPrep");
                                  }}
                                  className="inline-flex items-center gap-1.5 text-[10px] md:text-xs text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:underline font-black uppercase tracking-widest whitespace-nowrap"
                                >
                                  {isHebrew ? "שפר מועמדות ופתור" : "Optimize Trajectory"}
                                  <Sparkles className="w-3.5 h-3.5" />
                                </button>
                                
                                <div
                                  className={`p-2 rounded-full border border-stone-100 dark:border-stone-800 transition-transform ${isExpanded ? "rotate-180 bg-stone-50 dark:bg-stone-800" : ""}`}
                                >
                                  <ChevronDown className="w-5 h-5 text-stone-400" />
                                </div>
                              </div>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  key={`expanded-details-${op.id}`}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="pt-8 space-y-6">
                                    <p className="text-stone-400 dark:text-stone-500 text-xs md:text-sm max-w-2xl leading-relaxed font-normal">
                                      {op.description}
                                    </p>

                                    {/* Active Match State displaying pure semantic metrics or fallback profile gap-analysis */}
                                    {(!op.matchAnalysis || (op.matchScore || 0) < 60) ? (
                                      <div className="p-5 bg-stone-50 dark:bg-stone-800/40 border-[2px] border-dashed border-stone-200 dark:border-stone-800 rounded-2xl md:rounded-[1.5rem] space-y-3">
                                        <div className="flex items-center gap-2">
                                          <AlertCircle className="w-4 h-4 text-amber-500" />
                                          <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-300">
                                            {isHebrew ? "ניתוח פערים מורחב • PROFILE GAP ANALYSIS" : "PROFILE GAP ANALYSIS"}
                                          </span>
                                        </div>
                                        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                                          {(() => {
                                            const computedStr = Array.isArray(op.technologies) 
                                              ? op.technologies.join(", ") 
                                              : (typeof op.technologies === "string" ? op.technologies : "");
                                            return isHebrew 
                                              ? `המערכת זיהתה חוסר התאמה מרובה בפרופיל עבור דרישות משרה תחרותיות אלו. מומלץ לחזק את המומחיות בטכנולוגיות: ${computedStr || "כישורי המפתח"} כדי לחצות את רף ההתקבלות.`
                                              : `Our pipeline identified specific competency misalignments. We advise refining your experience with credentials in: ${computedStr || "core tech stacks"} to pass automatic vetting thresholds.`;
                                          })()}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 md:gap-4 pt-3">
                                        <div className="space-y-1.5">
                                          <div className="flex justify-between items-center w-full sm:w-24">
                                            <span className="text-[8px] uppercase font-black text-stone-400">
                                              {isHebrew ? "כישורים" : "Skills"}
                                            </span>
                                            <span className="text-[8px] font-black text-stone-500">
                                              {op.matchAnalysis.skillsScore}%
                                            </span>
                                          </div>
                                          <div className="w-full sm:w-24 h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                                            <motion.div
                                              initial={{ width: 0 }}
                                              animate={{
                                                width: `${op.matchAnalysis.skillsScore}%`,
                                              }}
                                              className="h-full bg-blue-500"
                                            />
                                          </div>
                                        </div>
                                        <div className="space-y-1.5">
                                          <div className="flex justify-between items-center w-full sm:w-24">
                                            <span className="text-[8px] uppercase font-black text-stone-400">
                                              {isHebrew ? "ניסיון" : "Experience"}
                                            </span>
                                            <span className="text-[8px] font-black text-stone-500">
                                              {op.matchAnalysis.experienceScore}%
                                            </span>
                                          </div>
                                          <div className="w-full sm:w-24 h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                                            <motion.div
                                              initial={{ width: 0 }}
                                              animate={{
                                                width: `${op.matchAnalysis.experienceScore}%`,
                                              }}
                                              className="h-full bg-green-500"
                                            />
                                          </div>
                                        </div>
                                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                          <div className="flex justify-between items-center w-full sm:w-24">
                                            <span className="text-[8px] uppercase font-black text-stone-400">
                                              {isHebrew ? "בכירות" : "Seniority"}
                                            </span>
                                            <span className="text-[8px] font-black text-stone-500">
                                              {op.matchAnalysis.seniorityScore}%
                                            </span>
                                          </div>
                                          <div className="w-full sm:w-24 h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                                            <motion.div
                                              initial={{ width: 0 }}
                                              animate={{
                                                width: `${op.matchAnalysis.seniorityScore}%`,
                                              }}
                                              className="h-full bg-amber-500"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex flex-col gap-4">
                                      {op.matchDetails && op.matchDetails.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                          <span className="w-full text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                            {isHebrew ? "חוזקות" : "Strengths"}
                                          </span>
                                          {op.matchDetails.map((detail, idx) => (
                                            <span
                                              key={idx}
                                              className="text-[9px] font-bold px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-800/30"
                                            >
                                              {detail}
                                            </span>
                                          ))}
                                        </div>
                                      )}

                                      {op.missingSkills && op.missingSkills.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                          <span className="w-full text-[8px] font-black uppercase tracking-widest text-stone-400 mb-1 flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-600" />
                                            {isHebrew ? "פערים" : "Potential Gaps"}
                                          </span>
                                          {op.missingSkills.map((skill, idx) => (
                                            <span
                                              key={idx}
                                              className="text-[9px] font-bold px-2 py-1 bg-stone-100 dark:bg-stone-800/50 text-stone-500 dark:text-stone-400 rounded-lg border border-stone-200 dark:border-stone-700/50"
                                            >
                                              {skill}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      );
                    });
                  })()}
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button
                  onClick={() => {
                    if (isSharedMode) {
                      alert(isHebrew ? "סימולטור הצ'אט נחסם מתוך הגדרות שיתוף מאובטחות למנוע חשיפת מידע." : "Interactive chat simulation is disabled in safe-shared mode to protect privacy.");
                      return;
                    }
                    setReflectionState("interviewPrep");
                  }}
                  className={`p-6 md:p-10 text-left rounded-[2rem] md:rounded-[3rem] space-y-6 hover:scale-[1.03] active:scale-95 transition-all shadow-xl ${isSharedMode ? "bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-400 cursor-not-allowed shadow-none" : "bg-amber-400 text-stone-900 shadow-amber-400/20"}`}
                >
                  <MessageSquare className="w-8 h-8 md:w-10 md:h-10 opacity-40" />
                  <div className="space-y-2">
                    <h3 className="text-xl md:text-2xl font-black tracking-tight">
                      {t("common.interviewPrep")}
                    </h3>
                    <p className="text-xs md:text-sm font-bold opacity-60 leading-relaxed">
                      {isSharedMode ? (
                        isHebrew ? "תרגול שאלות ודימוי ראיונות חסומים כאן מטעמי אבטחה ופרטיות." : "Practice simulator features are disabled in secure presentation mode."
                      ) : (
                        isHebrew ? "תרגל שאלות קריטיות שנוצרו במיוחד עבור הפרופיל שלך." : "Practice high-pressure questions generated specifically for your unique profile."
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-black text-[10px] md:text-xs uppercase tracking-widest pt-4">
                    {isSharedMode ? (
                      <>
                        <Lock className="w-4 h-4" />
                        {isHebrew ? "צ'אט נעול למבקרים" : "Chat Locked for Security"}
                      </>
                    ) : (
                      <>
                        {isHebrew ? "התחל תרגול" : "Begin Practice"}
                        <ArrowRight
                          className={`w-4 h-4 md:w-5 md:h-5 ${isHebrew ? "rotate-180" : ""}`}
                        />
                      </>
                    )}
                  </div>
                </button>

                <div className="p-6 md:p-10 border-2 border-stone-100 bg-white rounded-[2rem] md:rounded-[3rem] space-y-6 md:space-y-8 flex flex-col justify-center items-center text-center">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-stone-50 rounded-full flex items-center justify-center">
                    <History className="w-6 h-6 md:w-8 md:h-8 text-stone-300" />
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <h3 className="text-lg md:text-xl font-black">
                      {isHebrew ? "עדכון נתונים" : "Need adjustments?"}
                    </h3>
                    <p className="text-xs md:text-sm text-stone-400 max-w-xs">
                      {isHebrew
                        ? "תמיד אפשר לחזור ולעדכן את הציפיות שלך לניתוח מדויק יותר."
                        : "You can always go back and refine your input for a more surgical analysis."}
                    </p>
                  </div>
                  <button
                    onClick={() => handleTabChange(Tab.Explore)}
                    className="px-6 md:px-8 h-10 md:h-12 bg-stone-900 text-white rounded-xl md:rounded-2xl font-bold hover:scale-105 active:scale-95 transition-transform text-sm"
                  >
                    {t("common.backToEdit")}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        }

        if (activePracticeQuestion) {
          if (isSharedMode) {
            return (
              <motion.div
                key="active-chat-disabled"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pb-40 text-center py-20 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl space-y-4"
              >
                <Lock className="w-12 h-12 text-stone-400 mx-auto" />
                <h3 className="text-xl font-bold text-stone-950 dark:text-white">
                  {isHebrew ? "הצ'אט חסום למשתפו" : "Chat Restricted in Secured Preview"}
                </h3>
                <p className="text-stone-500 text-sm max-w-sm mx-auto">
                  {isHebrew
                    ? "סימולאציות ראיון ותקשורת היסטורית חסומות בקישור שיתוף זה."
                    : "Interactive interviewer simulation and chat memory are fully disabled for security reasons."}
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => setActivePracticeQuestion(null)}
                    className="px-6 py-2.5 bg-stone-900 text-white font-bold rounded-xl text-xs hover:scale-105 transition-transform"
                  >
                    {isHebrew ? "חזרה" : "Go Back"}
                  </button>
                </div>
              </motion.div>
            );
          }
          return (
            <motion.div
              key="active-chat"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="pb-40"
            >
              <AIChatPrep
                question={activePracticeQuestion.question}
                strategyReason={activePracticeQuestion.reason}
                isHebrew={isHebrew}
                onExit={() => setActivePracticeQuestion(null)}
              />
            </motion.div>
          );
        }

        return (
          <motion.div
            key="interview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pb-40 space-y-12"
          >
            <div className="flex items-center gap-4 md:gap-6">
              <button
                onClick={() => setReflectionState("insights")}
                className="w-10 h-10 md:w-12 md:h-12 bg-white border border-stone-200 rounded-xl md:rounded-2xl flex items-center justify-center text-stone-500 hover:text-stone-900 hover:border-stone-900 transition-all shadow-sm"
              >
                <ChevronLeft
                  className={`w-6 h-6 md:w-7 md:h-7 ${isHebrew ? "rotate-180" : ""}`}
                />
              </button>
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                  {t("common.interviewPrep")}
                </h2>
                <p className="text-xs md:text-base text-stone-400 font-bold">
                  {alignmentData?.roleTitle}
                </p>
              </div>
            </div>

            <div className="space-y-8">
              {alignmentData?.questions?.map((q, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="p-6 md:p-12 bg-white border border-stone-200 rounded-3xl md:rounded-[3rem] space-y-6 md:space-y-10 shadow-sm hover:shadow-xl transition-shadow"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-stone-900 text-white text-[10px] font-black rounded-full uppercase tracking-tighter">
                        {isHebrew ? "שאלה" : "Question"} {i + 1}
                      </span>
                    </div>
                    <p className="text-xl md:text-3xl font-black text-stone-900 leading-tight">
                      {q.question}
                    </p>
                  </div>
                  <div className="p-4 md:p-8 bg-stone-50 rounded-2xl md:rounded-[2rem] space-y-4 border border-stone-100">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-stone-400" />
                      <p className="text-[10px] md:text-xs font-black text-stone-400 uppercase tracking-widest">
                        {isHebrew ? "ניתוח AI" : "Strategy insight"}
                      </p>
                    </div>
                    <p className="text-sm md:text-lg text-stone-600 font-medium italic">
                      "{q.reason}"
                    </p>
                  </div>
                  <div className="pt-2 flex justify-end">
                    {isSharedMode ? (
                      <div className="px-6 py-3.5 bg-stone-100 dark:bg-stone-800 text-stone-400 font-bold text-xs rounded-xl md:rounded-2xl flex items-center gap-2 border border-stone-200 dark:border-stone-700">
                        <Lock className="w-4 h-4 text-stone-450" />
                        {isHebrew ? "סימולטור הצ'אט נעול בשיתוף מאובטח" : "Chat Locked in Secure Share"}
                      </div>
                    ) : (
                      <button
                        onClick={() => setActivePracticeQuestion({ question: q.question, reason: q.reason })}
                        className="px-6 py-3.5 bg-stone-900 text-white font-black uppercase text-xs rounded-xl md:rounded-2xl hover:scale-105 transition-transform flex items-center gap-2 shadow-md cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        {isHebrew ? "התחל סימולציית תרגול" : "Start Practice Simulation"}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-8 md:p-12 bg-stone-900 text-white rounded-3xl md:rounded-[3rem] text-center space-y-6">
              <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-amber-400 mx-auto" />
              <h3 className="text-xl md:text-2xl font-black">
                {isHebrew ? "מרגישים מוכנים?" : "Feeling ready?"}
              </h3>
              <p className="text-xs md:text-sm text-stone-400 max-w-md mx-auto">
                {isHebrew
                  ? "השתמש בתובנות אלו כדי לבנות ביטחון מול המעסיק הבא שלך."
                  : "Use these strategic insights to build bulletproof confidence before your next high-stakes meeting."}
              </p>
              <button
                onClick={() => setReflectionState("insights")}
                className="px-8 h-14 md:h-16 bg-white text-stone-900 rounded-xl md:rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform text-sm md:text-base"
              >
                {isHebrew ? "חזרה לניתוח" : "Back to Strategy"}
              </button>
            </div>
          </motion.div>
        );

      case Tab.Settings:
        return (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="pb-40 space-y-12"
          >
            <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tight">
                {isHebrew ? "הגדרות חשבון" : "Settings"}
              </h2>
              <p className="text-xl text-stone-500 font-medium">
                {isHebrew
                  ? "נהל את העדפות הניתוח שלך"
                  : "Tailor your engineering and analysis preferences"}
              </p>
            </div>

            <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-[3rem] p-12 space-y-16 shadow-sm">
              <div className="space-y-10">
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-stone-300 dark:text-stone-700">
                  {isHebrew ? "ממשק" : "Global Interface"}
                </h3>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex gap-6 items-center">
                    <div className="w-14 h-14 bg-stone-50 dark:bg-stone-800 rounded-[1.5rem] flex items-center justify-center border border-stone-100 dark:border-stone-700">
                      <Globe className="w-7 h-7 text-stone-900 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-black text-xl leading-none mb-1 dark:text-white">
                        {isHebrew ? "שפה" : "Market Context"}
                      </p>
                      <p className="text-stone-400 dark:text-stone-500 font-medium">
                        {isHebrew
                          ? "ממשק בעברית"
                          : "Localized English Interface"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => i18n.changeLanguage(isHebrew ? "en" : "he")}
                    className="px-8 h-14 border-2 border-stone-900 dark:border-stone-400 text-stone-900 dark:text-stone-400 rounded-2xl font-black uppercase tracking-widest hover:bg-stone-900 hover:text-white dark:hover:bg-amber-400 dark:hover:text-stone-900 dark:hover:border-amber-400 transition-all active:scale-95"
                  >
                    {isHebrew ? "EN" : "HE"}
                  </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex gap-6 items-center">
                    <div className="w-14 h-14 bg-stone-50 dark:bg-stone-800 rounded-[1.5rem] flex items-center justify-center border border-stone-100 dark:border-stone-700">
                      <Sparkles className="w-7 h-7 text-stone-900 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-black text-xl leading-none mb-1 dark:text-white">
                        {isHebrew ? "הדרכת מערכת" : "System Guide"}
                      </p>
                      <p className="text-stone-400 font-medium">
                        {isHebrew
                          ? "צפה בהסברים על המערכת"
                          : "Replay the onboarding walkthrough"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowOnboarding(true)}
                    className="px-8 h-14 border-2 border-stone-200 dark:border-stone-700 rounded-2xl font-black uppercase tracking-widest hover:border-stone-900 dark:hover:border-white transition-all active:scale-95 text-stone-500 dark:text-stone-400"
                  >
                    {isHebrew ? "הפעל הדרכה" : "View Guide"}
                  </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex gap-6 items-center">
                    <div className="w-14 h-14 bg-stone-50 dark:bg-stone-800 rounded-[1.5rem] flex items-center justify-center border border-stone-100 dark:border-stone-700">
                      <Layout className="w-7 h-7 text-stone-900 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-black text-xl leading-none mb-1 dark:text-white">
                        {isHebrew ? "מצב כהה" : "Midnight Mode"}
                      </p>
                      <p className="text-stone-400 dark:text-stone-500 font-medium">
                        {isDarkMode
                          ? isHebrew
                            ? "נוכחות פעילה"
                            : "Active Presence"
                          : isHebrew
                            ? "תצוגה רגילה"
                            : "Standard View"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    className={`w-16 h-10 rounded-full p-1.5 transition-colors ${isDarkMode ? "bg-amber-400" : "bg-stone-100 dark:bg-stone-800"}`}
                  >
                    <motion.div
                      animate={{ x: isDarkMode ? 24 : 0 }}
                      className="w-7 h-7 bg-white dark:bg-stone-900 rounded-full shadow-md"
                    />
                  </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-t border-stone-100 dark:border-stone-800 pt-8 mt-8">
                  <div className="flex gap-6 items-center">
                    <div className="w-14 h-14 bg-stone-50 dark:bg-stone-800 rounded-[1.5rem] flex items-center justify-center border border-stone-100 dark:border-stone-700 shrink-0">
                      <Lock className="w-7 h-7 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-black text-xl leading-none mb-1 dark:text-white">
                        {isHebrew ? "קישור שיתוף בטוח" : "Secure Shared Preview"}
                      </p>
                      <p className="text-stone-400 dark:text-stone-500 font-medium text-xs max-w-md leading-relaxed">
                        {isHebrew
                          ? "צור קישור מאובטח ללא גישה לצ'אט ולהיסטוריה, המגן על פרטיותך באופן מוחלט."
                          : "Generate a secure, leak-proof link to share your analytics with others. Chat and history are fully disabled for visitors."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCopySecureShareLink}
                    className="px-8 h-12 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all active:scale-95 flex items-center gap-2"
                  >
                    {linkCopied ? (
                      isHebrew ? "הועתק בהצלחה! ✔" : "Copied! ✔"
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        {isHebrew ? "העתק קישור" : "Copy Link"}
                      </>
                    )}
                  </button>
                </div>

                {currentUser && (
                  <>
                    <div className="pt-12 border-t-2 border-stone-50 dark:border-stone-900 space-y-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-stone-300 dark:text-stone-700">
                          {isHebrew ? "פרופיל אישי" : "User Profile"}
                        </h3>
                        <button 
                          onClick={() => setOnboardingRequired(true)}
                          className="text-[10px] font-black text-amber-500 uppercase hover:underline"
                        >
                          {isHebrew ? "ערוך פרופיל" : "Edit Profile"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-3xl border border-stone-100 dark:border-stone-800 space-y-2">
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{isHebrew ? "אימייל" : "Email"}</p>
                          <p className="font-bold dark:text-white truncate">{userProfile?.email || currentUser.email}</p>
                        </div>
                        <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-3xl border border-stone-100 dark:border-stone-800 space-y-2">
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{isHebrew ? "טלפון" : "Phone"}</p>
                          <p className="font-bold dark:text-white">{userProfile?.phone || "—"}</p>
                        </div>
                        <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-3xl border border-stone-100 dark:border-stone-800 space-y-2">
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{isHebrew ? "מיקום" : "Location"}</p>
                          <p className="font-bold dark:text-white">{userProfile?.location || "—"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-12 border-t-2 border-stone-50 dark:border-stone-900 space-y-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-stone-300 dark:text-stone-700">
                          {isHebrew ? "תוכנית מנוי ותקציב AI" : "Subscription & AI Budget"}
                        </h3>
                        {userProfile?.planType !== "premium" && (
                          <button
                            onClick={() => setIsUpgradeModalOpen(true)}
                            className="text-[10px] font-black text-amber-500 uppercase hover:underline"
                          >
                            {isHebrew ? "שדרג עכשיו" : "Upgrade Now"}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Plan Details Card */}
                        <div className="p-8 bg-stone-50 dark:bg-stone-900/60 rounded-3xl border border-stone-100 dark:border-stone-800 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">
                                {isHebrew ? "תוכנית פעילה" : "ACTIVE ACCOUNT TIER"}
                              </span>
                              <h4 className="text-2xl font-black uppercase tracking-tight dark:text-white">
                                {userProfile?.planType === "premium" 
                                  ? (isHebrew ? "מנוי פרימיום" : "Premium Plan")
                                  : (isHebrew ? "מנוי חינם" : "Free Plan")}
                              </h4>
                            </div>
                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${
                              userProfile?.planType === "premium" 
                                ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" 
                                : "bg-stone-200 dark:bg-stone-800 text-stone-400"
                            }`}>
                              {userProfile?.planType === "premium" ? "Premium" : "Free"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs text-stone-400 font-medium leading-relaxed">
                              {userProfile?.planType === "premium"
                                ? (isHebrew 
                                    ? "מנוי פעיל השומר על התקציב שלך ועבודה בעדיפות גבוהה." 
                                    : "Active VIP Career Plan. Core search matching and resume feedback is highly priority cached.")
                                : (isHebrew
                                    ? "מגבלה של חיפוש עבודה מבוסס AI אחד בכל חודש קלנדרי."
                                    : "Limited to 1 successful smart AI-powered job search match per calendar month.")}
                            </p>
                            <div className="flex justify-between text-xs pt-2">
                              <span className="text-stone-400 font-medium">{isHebrew ? "חיפושים שנוצלו החודש:" : "Searches used this month:"}</span>
                              <span className="font-bold dark:text-white">
                                {userProfile?.searchesUsed ?? 0} / {userProfile?.planType === "premium" ? 10 : 1}
                              </span>
                            </div>
                            <div className="w-full bg-stone-200 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, (((userProfile?.searchesUsed ?? 0) / (userProfile?.planType === "premium" ? 10 : 1)) * 100))}%`
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Financial Ledger & AI Budget Pool Card */}
                        <div className="p-8 bg-stone-50 dark:bg-stone-900/60 rounded-3xl border border-stone-100 dark:border-stone-800 space-y-4">
                          <div>
                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">
                              {isHebrew ? "יתרת תקציב ה-AI שלך" : "DEDICATED AI API BUDGET"}
                            </span>
                            <h4 className="text-2xl font-black uppercase tracking-tight dark:text-white">
                              ${Number(userProfile?.apiBudgetPool || 0).toFixed(4)}
                            </h4>
                          </div>

                          <div className="space-y-2 text-xs">
                            <p className="text-stone-400 font-medium leading-relaxed text-[11px]">
                              {userProfile?.planType === "premium"
                                ? (isHebrew
                                    ? "מתוך דמי המנוי ($5.00) מוקצים ישירות למימון עלויות ה-AI. עלות כל שאילתה מנוכה ומיושבת בזמן אמת."
                                    : "$5.00 of your subscription payment fuels your personal API budget pool. Charges are evaluated and reconciled per token.")
                                : (isHebrew
                                    ? "שדרג לפרימיום כדי לפתוח יתרת תקציב AI בסך $5.00 לחיפושים מתקדמים ללא השבתה."
                                    : "Upgrade to Premium to assign your $5.00 primary AI budget pool and enable unlimited continuous matches.")}
                            </p>

                            {userProfile?.planType === "premium" && (
                              <div className="pt-2">
                                {Number(userProfile?.apiBudgetPool || 0) < 1.00 ? (
                                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl leading-relaxed text-[11px]">
                                    {isHebrew 
                                      ? "⚠️ התראה: תקציב ה-AI שלך נמוך מ-20%. אנא שדרג שוב או פנה לתמיכה להקצאה מחדש."
                                      : "⚠️ Warning: Your AI cost budget pool is below 20%. Consider upgrading again to sustain unlimited queries."}
                                  </div>
                                ) : (
                                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl leading-relaxed text-[11px] font-medium">
                                    {isHebrew
                                      ? "✔ החשבון במצב יציב וממומן. שיעור ניצול תקין."
                                      : "✔ Operational health is stable. Budget depletion is low."}
                                  </div>
                                )}
                              </div>
                            )}

                            {userProfile?.planType !== "premium" && (
                              <button
                                onClick={() => setIsUpgradeModalOpen(true)}
                                className="w-full h-11 bg-amber-400 text-stone-900 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-102 active:scale-98 transition-all pt-0.5"
                              >
                                {isHebrew ? "שדרג כעת וקבל פרימיום" : "Upgrade & Claim $5.00 Pool"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-12 border-t-2 border-stone-50 dark:border-stone-900 space-y-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-stone-300 dark:text-stone-700">
                          {isHebrew ? "משרות שנשמרו" : "Saved Jobs"}
                        </h3>
                        <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 rounded-lg text-[10px] font-black text-stone-400">
                          {likedJobIds.length} {isHebrew ? "שמורות" : "Saved"}
                        </span>
                      </div>

                      <div className="space-y-4">
                        {savedJobs.length === 0 ? (
                          <div className="p-8 text-center border-2 border-dashed border-stone-100 dark:border-stone-800 rounded-3xl">
                            <p className="text-sm text-stone-400 italic">
                              {isHebrew ? "עוד לא שמרת משרות. לחץ על הלב בטאב Explore." : "No saved jobs yet. Click the heart in the Explore tab."}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {savedJobs.map(sj => (
                              <div key={sj.id} className="p-5 bg-stone-50 dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                                    <Heart className="w-5 h-5 text-amber-600 fill-current" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold dark:text-white truncate max-w-[150px]">
                                      {sj.jobData?.title}
                                    </p>
                                    <p className="text-[10px] text-stone-400 uppercase tracking-widest">
                                      {sj.jobData?.company}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => toggleJobLike(currentUser.uid, sj.jobData)}
                                  className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-stone-300 hover:text-red-500"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-12 border-t-2 border-stone-50 dark:border-stone-900 space-y-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-stone-300 dark:text-stone-700">
                          {isHebrew ? "התראות פעילות" : "Active Job Alerts"}
                        </h3>
                        <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 rounded-lg text-[10px] font-black text-stone-400">
                          {jobAlerts.length} {isHebrew ? "פעילות" : "Active"}
                        </span>
                      </div>

                    <div className="space-y-4">
                      {jobAlerts.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed border-stone-100 dark:border-stone-800 rounded-3xl">
                           <p className="text-sm text-stone-400 italic">
                             {isHebrew ? "אין התראות פעילות. הירשם דרך טאב Growth." : "No active alerts. Subscribe via the Growth tab."}
                           </p>
                        </div>
                      ) : (
                        jobAlerts.map(alert => (
                          <div key={alert.id} className="p-6 bg-stone-50 dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white dark:bg-stone-800 rounded-xl flex items-center justify-center shadow-sm">
                                <Bell className="w-5 h-5 text-amber-500" />
                              </div>
                              <div>
                                <p className="font-bold text-stone-900 dark:text-white">{alert.title}</p>
                                <p className="text-xs text-stone-400">{alert.location} • {alert.seniority}</p>
                              </div>
                            </div>
                            <button 
                              onClick={async () => {
                                await deleteJobAlert(alert.id);
                                refreshJobAlerts();
                              }}
                              className="p-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-stone-400 hover:text-red-500 rounded-xl transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

              <div className="pt-12 border-t-2 border-stone-50 dark:border-stone-900 space-y-8">
                <div>
                  <p className="text-[10px] uppercase font-black text-stone-300 dark:text-stone-700 tracking-[0.4em] mb-6">
                    {isHebrew ? "משוב ושיפור" : "Feedback & Improvement"}
                  </p>
                  <form onSubmit={handleSubmitFeedback} className="space-y-4">
                    <div className="flex gap-2">
                      {(["suggestion", "issue", "other"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFeedbackType(type)}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                            feedbackType === type
                              ? "bg-stone-900 text-white border-stone-900 dark:bg-amber-400 dark:text-stone-900 dark:border-amber-400"
                              : "border-stone-100 dark:border-stone-800 text-stone-400"
                          }`}
                        >
                          {isHebrew
                            ? type === "suggestion"
                              ? "הצעה"
                              : type === "issue"
                                ? "תקלה"
                                : "אחר"
                            : type}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder={
                        isHebrew
                          ? "ספר לנו מה דעתך או דווח על תקלה..."
                          : "Tell us what you think or report an issue..."
                      }
                      className="w-full h-32 bg-stone-50 dark:bg-stone-900 border-2 border-stone-100 dark:border-stone-800 rounded-2xl p-4 text-sm focus:border-stone-900 dark:focus:border-amber-400 outline-none transition-all resize-none dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingFeedback || !feedbackMessage.trim()}
                      className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        feedbackSuccess
                          ? "bg-emerald-500 text-white"
                          : "bg-stone-900 text-white dark:bg-amber-400 dark:text-stone-900 disabled:opacity-50"
                      }`}
                    >
                      {isSubmittingFeedback ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : feedbackSuccess ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          {isHebrew ? "נשלח בהצלחה!" : "Sent Successfully!"}
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-5 h-5" />
                          {isHebrew ? "שלח משוב" : "Submit Feedback"}
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              <div className="pt-12 border-t-2 border-stone-50 dark:border-stone-900 space-y-8">
                <p className="text-[10px] uppercase font-black text-stone-300 dark:text-stone-700 tracking-[0.4em]">
                  {isHebrew ? "משתמש" : "Identity"}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-3xl flex items-center justify-center font-black text-2xl shadow-inner border border-amber-200 dark:border-amber-900/40">
                      {userName ? userName[0].toUpperCase() : "U"}
                    </div>
                    <div>
                      <p className="font-black text-xl text-stone-900 dark:text-white leading-none mb-1">
                        {userName || (isHebrew ? "משתמש אורח" : "Guest User")}
                      </p>
                      <p className="text-stone-400 dark:text-stone-700 font-medium text-xs">
                        Session ID:{" "}
                        {Math.random().toString(36).substring(7).toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={clearSession}
                    className="text-stone-400 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 font-black text-sm uppercase tracking-widest transition-colors flex items-center gap-2"
                  >
                    {isHebrew ? "התנתקות" : "Clear Session"}
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Legal Policies & Paddle Verification Links */}
            <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-[3rem] p-12 space-y-10 shadow-sm">
              <div className="space-y-4 text-right sm:text-left">
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-stone-300 dark:text-stone-700">
                  {isHebrew ? "מידע משפטי ויחסי לקוחות" : "Legal & Corporate Information"}
                </h3>
                <p className="text-sm text-stone-400 font-medium leading-relaxed">
                  {isHebrew 
                    ? "תנאי השימוש, מדיניות הפרטיות והחזרי הרכישות הרשמיים שלנו מעובדים על ידי משווק מורשה Paddle." 
                    : "Official customer service terms, privacy policy, and subscription return guarantees reseller disclosures."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setCurrentUrlPage("terms");
                    window.history.pushState({}, "", "/?page=terms");
                  }}
                  className="p-6 bg-stone-50 dark:bg-stone-900/45 border border-stone-150 dark:border-stone-800 rounded-[2rem] text-left hover:border-amber-400 dark:hover:border-amber-400 hover:scale-[1.02] transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1 text-right sm:text-left w-full">
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block">
                      {isHebrew ? "הסכם משתמש" : "USER AGREEMENT"}
                    </span>
                    <span className="font-bold text-stone-900 dark:text-white block">
                      {isHebrew ? "תנאי שימוש" : "Terms of Service"}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-amber-400 transition-colors shrink-0" />
                </button>

                <button
                  onClick={() => {
                    setCurrentUrlPage("privacy");
                    window.history.pushState({}, "", "/?page=privacy");
                  }}
                  className="p-6 bg-stone-50 dark:bg-stone-900/45 border border-stone-150 dark:border-stone-800 rounded-[2rem] text-left hover:border-amber-400 dark:hover:border-amber-400 hover:scale-[1.02] transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1 text-right sm:text-left w-full">
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block">
                      {isHebrew ? "מדיניות נתונים" : "DATA PROTECTION"}
                    </span>
                    <span className="font-bold text-stone-900 dark:text-white block">
                      {isHebrew ? "מדיניות פרטיות" : "Privacy Policy"}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-amber-400 transition-colors shrink-0" />
                </button>

                <button
                  onClick={() => {
                    setCurrentUrlPage("refund");
                    window.history.pushState({}, "", "/?page=refund");
                  }}
                  className="p-6 bg-stone-50 dark:bg-stone-900/45 border border-stone-150 dark:border-stone-800 rounded-[2rem] text-left hover:border-amber-400 dark:hover:border-amber-400 hover:scale-[1.02] transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1 text-right sm:text-left w-full">
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block">
                      {isHebrew ? "החזר כספי בטוח" : "14-DAY GUARANTEE"}
                    </span>
                    <span className="font-bold text-stone-900 dark:text-white block">
                      {isHebrew ? "מדיניות החזרים" : "Refund Policy"}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-amber-400 transition-colors shrink-0" />
                </button>

                <button
                  onClick={() => {
                    setCurrentUrlPage("pricing");
                    window.history.pushState({}, "", "/?page=pricing");
                  }}
                  className="p-6 bg-stone-50 dark:bg-stone-900/45 border border-stone-150 dark:border-stone-800 rounded-[2rem] text-left hover:border-amber-400 dark:hover:border-amber-400 hover:scale-[1.02] transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1 text-right sm:text-left w-full">
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block">
                      {isHebrew ? "מסלולי רכישה" : "ACTIVE TIERS"}
                    </span>
                    <span className="font-bold text-stone-900 dark:text-white block">
                      {isHebrew ? "תוכנית ותמחור" : "Pricing Plans"}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-amber-400 transition-colors shrink-0" />
                </button>
              </div>

              <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-3xl border border-stone-150 dark:border-stone-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold">
                <div className="space-y-1 text-center md:text-right">
                  <p className="dark:text-white font-bold">{isHebrew ? "יש לך שאלה בנוגע לחיוב או ביטול?" : "Have a billing or reseller support question?"}</p>
                  <p className="text-stone-400 font-medium">{isHebrew ? "אנחנו פה כדי לעזור לך להתקדם בביטחון" : "Our support desk acts as your direct advocate."}</p>
                </div>
                <a 
                  href="mailto:calmshop24@gmail.com"
                  className="px-6 h-11 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-900 rounded-xl font-black uppercase text-[10px] tracking-wider hover:scale-105 transition-all flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>calmshop24@gmail.com</span>
                </a>
              </div>
            </div>

            <div className="p-12 bg-stone-50 dark:bg-stone-900 rounded-[3rem] border border-stone-100 dark:border-stone-800 text-center space-y-4">
              <p className="text-xs font-black text-stone-400 dark:text-stone-600 uppercase tracking-[0.4em]">
                Developer Console
              </p>
              <p className="text-stone-500 dark:text-stone-400 font-medium italic">
                "Every line of code is a career move."
              </p>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  if (currentUrlPage) {
    return (
      <PoliciesPage
        isHebrewByDefault={isHebrew}
        onClose={() => {
          setCurrentUrlPage(null);
          window.history.pushState({}, "", "/");
        }}
      />
    );
  }

  return (
    <div
      className={`min-h-screen bg-[#FDFCFB] dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans ${isHebrew ? "rtl" : "ltr"} selection:bg-stone-900 selection:text-white dark:selection:bg-amber-400 dark:selection:text-stone-900 pb-10`}
      dir={isHebrew ? "rtl" : "ltr"}
    >
      {/* Dynamic Header */}
      <header className="fixed top-0 left-0 right-0 h-20 md:h-24 bg-[#FDFCFB]/80 dark:bg-stone-950/80 backdrop-blur-xl border-b border-stone-200/40 dark:border-stone-800/40 z-50 flex items-center justify-between px-4 md:px-16">
        <div
          className="flex items-center gap-3 md:gap-4 group cursor-pointer"
          onClick={() => handleTabChange(Tab.Explore)}
        >
          <div className="w-10 h-10 md:w-14 md:h-14 bg-stone-900 dark:bg-amber-400 rounded-xl md:rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-stone-900/20 dark:shadow-amber-400/20 group-hover:scale-105 transition-transform shrink-0">
            <Brain className="w-5 h-5 md:w-8 md:h-8 text-white dark:text-stone-900" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="font-black tracking-tight text-xl md:text-3xl block leading-none dark:text-white">
                JobBoost
              </span>
              <span className="px-1.5 py-0.5 bg-amber-400 text-stone-900 text-[8px] md:text-[10px] font-black rounded uppercase tracking-wider">
                BETA
              </span>
            </div>
            <span className="text-[8px] md:text-[10px] font-black tracking-[0.2em] md:tracking-[0.4em] uppercase text-stone-400 pl-0.5 opacity-60">
              Architect AI v1.0
            </span>
          </div>
          <div className="sm:hidden">
            <span className="font-black tracking-tight text-lg block leading-none dark:text-white">
              JobBoost
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-6">
          {isSharedMode && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 rounded-full text-[10px] md:text-xs font-bold leading-none select-none tracking-tight animate-pulse shrink-0">
              <Lock className="w-3.5 h-3.5" />
              <span>
                {isHebrew ? "מצב שיתוף מוגן (הצ'אט נעול למבקרים)" : "Protected Shared Preview"}
              </span>
            </div>
          )}

          {/* Real-time Alerts Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-3 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-2xl transition-all relative"
            >
              <Bell className="w-6 h-6 text-stone-600 dark:text-stone-400" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md animate-bounce">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  key="notifications-dropdown"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className={`absolute top-16 ${isHebrew ? "left-0" : "right-0"} w-80 bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-100 dark:border-stone-800 overflow-hidden z-[100]`}
                >
                  <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center bg-stone-50/50 dark:bg-stone-800/20">
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-stone-400">
                      {isHebrew ? "התראות חמות" : "Real-time Alerts"}
                    </h4>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => currentUser && clearAllNotifications(currentUser.uid)}
                        className="text-[10px] font-black text-amber-500 uppercase"
                      >
                        {isHebrew ? "נקה הכל" : "Clear all"}
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center space-y-3">
                        <BellRing className="w-8 h-8 text-stone-200 dark:text-stone-800 mx-auto" />
                        <p className="text-sm text-stone-400 font-medium">
                          {isHebrew ? "אין התראות חדשות עדיין" : "No new alerts yet"}
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id}
                          onClick={() => {
                            if (notif.id) {
                              markNotificationAsRead(notif.id);
                              setShowNotifications(false);
                            }
                          }}
                          className={`p-5 flex gap-4 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors cursor-pointer border-b border-stone-50 dark:border-stone-800/50 ${!notif.isRead ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}
                        >
                          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center shrink-0">
                            <Briefcase className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-stone-900 dark:text-white leading-tight">
                              {notif.jobData?.title} @ {notif.jobData?.company}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-emerald-500 uppercase">
                                {notif.jobData?.matchScore}% {isHebrew ? "התאמה" : "Match"}
                              </span>
                              <span className="text-[10px] text-stone-400">
                                {new Date(notif.createdAt?.seconds * 1000 || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {currentUser && (
                    <div className="p-4 bg-stone-50 dark:bg-stone-800/40 border-t border-stone-100 dark:border-stone-800">
                      <button 
                        onClick={async () => {
                           if (alignmentData?.marketOpportunities?.[0]) {
                             await createMockNotification(currentUser.uid, alignmentData.marketOpportunities[0]);
                           } else {
                             await createMockNotification(currentUser.uid, { title: "Lead Product Manager", company: "CyberNexus 2026", matchScore: 94 });
                           }
                        }}
                        className="w-full py-2 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-900 text-[10px] font-black uppercase tracking-widest rounded-xl"
                      >
                         {isHebrew ? "בדוק התאמות חדשות" : "Check New Matches"}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-8 w-px bg-stone-100 dark:bg-stone-800 mx-1 hidden sm:block" />

          {/* Auth Button */}
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-stone-900 dark:text-white truncate max-w-[100px] uppercase tracking-tight">
                  {currentUser.displayName}
                </p>
                <button 
                  onClick={logout}
                  className="text-[9px] font-black text-stone-400 uppercase hover:text-red-500 transition-colors"
                >
                  {isHebrew ? "התנתק" : "Sign out"}
                </button>
              </div>
              <img 
                src={currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`} 
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl border-2 border-stone-200 dark:border-stone-700 shadow-sm"
                alt="avatar"
              />
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="flex items-center gap-2 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-900 px-4 md:px-6 h-10 md:h-12 rounded-xl md:rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
            >
              <UserIcon className="w-4 h-4" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">
                {isHebrew ? "התחבר" : "Sign In"}
              </span>
            </button>
          )}

          <div className="h-8 w-px bg-stone-100 dark:bg-stone-800 mx-1 hidden lg:block" />

          <div className="hidden lg:flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="w-10 md:w-12 h-10 md:h-12 flex items-center justify-center bg-white dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 rounded-xl md:rounded-2xl text-stone-500 dark:text-stone-400 hover:border-stone-900 dark:hover:border-white transition-all shadow-sm active:scale-95"
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => i18n.changeLanguage(isHebrew ? "en" : "he")}
              className="h-10 md:h-12 px-4 md:px-6 bg-white dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:border-stone-900 dark:hover:border-white transition-all shadow-sm active:scale-95 dark:text-amber-400"
            >
              {isHebrew ? "EN" : "HE"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="pt-24 md:pt-32 pb-44 px-4 md:px-16 max-w-6xl mx-auto min-h-screen">
        <AnimatePresence mode="wait">{renderScreen()}</AnimatePresence>
      </main>

      {/* Modern Floating Bottom Nav */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-md">
        <nav
          className="h-24 bg-stone-900 dark:bg-stone-900/90 backdrop-blur-xl text-white rounded-[3rem] flex items-center justify-around px-4 shadow-2xl shadow-stone-900/40 border border-white/10"
          role="tablist"
        >
          <button
            onClick={() => handleTabChange(Tab.Explore)}
            role="tab"
            aria-selected={activeTab === Tab.Explore}
            aria-controls="explore-panel"
            aria-label={isHebrew ? "טאב חקירה" : "Explore tab"}
            className={`flex-1 flex flex-col items-center gap-2 transition-all relative ${activeTab === Tab.Explore ? "text-amber-400" : "text-stone-500 hover:text-stone-300"}`}
          >
            <Compass
              className={`w-7 h-7 transition-all ${activeTab === Tab.Explore ? "scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""}`}
            />
            <span className="text-[9px] uppercase font-black tracking-[0.2em]">
              {isHebrew ? "חקירה" : "Explore"}
            </span>
            {activeTab === Tab.Explore && (
              <motion.div
                layoutId="nav-glow"
                className="absolute -bottom-1 w-1 h-1 bg-amber-400 rounded-full blur-[2px]"
              />
            )}
          </button>

          <button
            onClick={() => handleTabChange(Tab.Growth)}
            role="tab"
            aria-selected={activeTab === Tab.Growth}
            aria-controls="growth-panel"
            aria-label={isHebrew ? "טאב צמיחה" : "Growth tab"}
            className={`flex-1 flex flex-col items-center gap-2 transition-all relative ${activeTab === Tab.Growth ? "text-amber-400" : "text-stone-500 hover:text-stone-300"}`}
          >
            <TrendingUp
              className={`w-7 h-7 transition-all ${activeTab === Tab.Growth ? "scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""}`}
            />
            <span className="text-[9px] uppercase font-black tracking-[0.2em]">
              {isHebrew ? "צמיחה" : "Growth"}
            </span>
            {activeTab === Tab.Growth && (
              <motion.div
                layoutId="nav-glow"
                className="absolute -bottom-1 w-1 h-1 bg-amber-400 rounded-full blur-[2px]"
              />
            )}
          </button>

          <button
            onClick={() => handleTabChange(Tab.Settings)}
            role="tab"
            aria-selected={activeTab === Tab.Settings}
            aria-controls="settings-panel"
            aria-label={isHebrew ? "טאב הגדרות" : "Settings tab"}
            className={`flex-1 flex flex-col items-center gap-2 transition-all relative ${activeTab === Tab.Settings ? "text-amber-400" : "text-stone-500 hover:text-stone-300"}`}
          >
            <SettingsIcon
              className={`w-7 h-7 transition-all ${activeTab === Tab.Settings ? "scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""}`}
            />
            <span className="text-[9px] uppercase font-black tracking-[0.2em]">
              {isHebrew ? "הגדרות" : "Settings"}
            </span>
            {activeTab === Tab.Settings && (
              <motion.div
                layoutId="nav-glow"
                className="absolute -bottom-1 w-1 h-1 bg-amber-400 rounded-full blur-[2px]"
              />
            )}
          </button>
        </nav>
      </div>

      {/* Grid Pattern Background - Strategic Accent */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] overflow-hidden -z-10">
        <div className="grid grid-cols-12 h-screen border-l border-stone-900">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="border-r border-stone-900 h-full" />
          ))}
        </div>
      </div>

       <AnimatePresence>
        {isUpgradeModalOpen && currentUser && (
          <UpgradeModal
            key="upgrade-modal"
            isOpen={isUpgradeModalOpen}
            onClose={() => setIsUpgradeModalOpen(false)}
            userId={currentUser.uid}
            isHebrew={isHebrew}
          />
        )}
        {!showOnboarding && <IntroOnboardingModal key="intro-onboarding" isHebrew={isHebrew} />}
        {showOnboarding && <OnboardingFlow key="onboarding-flow" isHebrew={isHebrew} />}
        {onboardingRequired && currentUser && (
          <OnboardingModal 
            key="onboarding-modal"
            user={currentUser} 
            profile={userProfile}
            isHebrew={isHebrew} 
            onComplete={() => setOnboardingRequired(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
