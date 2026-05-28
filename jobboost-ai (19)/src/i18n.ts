import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: {
          common: {
            analyzing: "Analyzing...",
        startReflection: "Start the Reflection",
        memberExclusive: "MEMBER EXCLUSIVE",
        accessCompass: "Access the 2026 Design Career Compass",
        needHelpUpload: "Need help with your upload?",
        keywordsAdded: "Keywords added",
        structureOptimized: "Structure optimized for {{role}} role",
        keyDifferentiators: "Key Differentiators",
        marketOpportunities: "Active Job Opportunities",
        filterTitle: "Filter by title...",
        filterCompany: "Filter by company...",
        filterLocation: "City / Location...",
        viewActive: "View Official Posting",
        noOpportunities: "No opportunities match your filters.",
        strategicGuidelines: "Strategic Market & Success Guidelines",
        recommendedActions: "Recommended Actions",
        nextQuestion: "Next Question",
        momentumDesc: "Your current career trajectory and readiness for the next level of responsibility.",
        interviewPrep: "Practice for your next interview",
        synthesized: "We've synthesized your experience with the {{role}} role. Here's how you can leverage your unique profile in your next chapter.",
        backToEdit: "Back to Edit",
        retry: "Retry Analysis",
        thinking: "JobBoost AI is currently analyzing your latest career data using our 2026 insights engine.",
        generating: "Generating 2026 growth strategy..."
      },
      explore: {
        heading: "Let's talk about your <1>new chapter.</1>",
        subheading: "Upload your resume or describe your experience to unlock a high-impact career strategy tailored for your next move.",
        storyHeading: "Your Professional Story",
        storySubheading: "Drag your resume here (PDF or Word) and we'll find the magic in your experience.",
        or: "OR",
        describeLabel: "Describe your path",
        describePlaceholder: "I've been a product designer for 5 years, focusing on...",
        targetRole: "Target Role / Job Title",
        location: "Preferred Location",
        environment: "Work Environment",
        seniority: "Seniority Level",
        remote: "Remote",
        hybrid: "Hybrid",
        onSite: "On-site",
        junior: "Junior / Entry",
        mid: "Mid-level / Professional",
        senior: "Senior / Leadership",
        namePlaceholder: "Your Name (Optional)",
        cta: "Start the Reflection"
      },
      reflections: {
        refinementHeading: "Refinement is the bridge to clarity.",
        refinementSubtext: "JobBoost AI is currently analyzing your latest career data using our 2026 insights engine.",
        generatingGrowthMap: "Generating 2026 growth strategy",
        getStarted: "Get Started"
      },
      insights: {
        marketOpportunities: "Active Job Opportunities",
        viewActive: "View Official Job Posting",
        yourRoadmap: "Your 2026 roadmap is ready",
        roleAnalysis: "Role Alignment Analysis",
        differentiators: "Unique Value Propositions",
        guidelines: "Strategic Growth Pillars",
        refinedResume: "2026 Optimized Summary",
        copySuccess: "Copied to clipboard!"
      }
    }
  },
  he: {
    translation: {
      common: {
        analyzing: "מנתח...",
        startReflection: "התחילו בגיבוש השאיפות",
        memberExclusive: "בלעדי לחברים",
        accessCompass: "צפו במצפן הקריירה של 2026",
        needHelpUpload: "צריכים עזרה עם ההעלה?",
        keywordsAdded: "נוספו מילות מפתח ממוקדות",
        structureOptimized: "מבנה אופטימלי למשרת {{role}}",
        keyDifferentiators: "גורמי בידול מרכזיים",
        marketOpportunities: "משרות והזדמנויות פעילות",
        filterTitle: "חיפוש תפקיד...",
        filterCompany: "חברה/סוג...",
        filterLocation: "מיקום/עיר...",
        viewActive: "צפייה במשרה הרשמית",
        noOpportunities: "לא נמצאו משרות התואמות את החיפוש.",
        strategicGuidelines: "אסטרטגיית שוק והצלחה בקריירה",
        recommendedActions: "פעולות מומלצות",
        nextQuestion: "שאלה הבאה",
        momentumDesc: "מסלול הקריירה הנוכחי שלך ומוכנות לרמה הבאה של אחריות.",
        interviewPrep: "תרגול לקראת הראיון הבא",
        synthesized: "זיקקנו את הניסיון שלך עם משרת {{role}}. כך תוכל להשתמש בפרופיל הייחודי שלך בפרק הבא שלך.",
        backToEdit: "חזרה לעריכה",
        retry: "ניסיון חוזר",
        thinking: "JobBoost AI מנתח כעת את הניסיון שלך באמצעות מנוע התובנות של 2026.",
        generating: "מייצר מפת דרכים ל-2026..."
      },
      explore: {
        heading: "בוא נדבר על ה<1>פרק הבא</1> שלך.",
        subheading: "העלו קורות חיים או תארו את הניסיון שלכם כדי לפתוח אסטרטגיית קריירה בעלת אימפקט גבוה המותאמת לצעד הבא שלכם.",
        storyHeading: "הסיפור המקצועי שלך",
        storySubheading: "גררו לכאן את קורות החיים שלכם (PDF או Word) ונעזור לכם למצוא את הקסם בניסיון שלכם.",
        or: "או",
        describeLabel: "תארו את המסלול שלכם",
        describePlaceholder: "אני מעצב מוצר כבר 5 שנים, מתמחה ב...",
        targetRole: "תפקיד מטרה / הגדרת תפקיד",
        location: "מיקום מועדף",
        environment: "סביבת עבודה",
        seniority: "דרג ניהולי / ניסיון",
        remote: "מרחוק",
        hybrid: "היברידי",
        onSite: "מהמשרד",
        junior: "ג'וניור",
        mid: "מיד-לבל",
        senior: "סניור / ניהול",
        namePlaceholder: "שם מלא (אופציונלי)",
        cta: "התחילו בגיבוש השאיפות"
      },
      reflections: {
        refinementHeading: "גיבוש תובנות הוא הגשר לבהירות.",
        refinementSubtext: "JobBoost AI מנתח כעת את הניסיון שלך באמצעות מנוע התובנות של 2026.",
        generatingGrowthMap: "יוצרים אסטרטגיית צמיחה ל-2026",
        getStarted: "מתחילים"
      },
      insights: {
        marketOpportunities: "משרות והזדמנויות פעילות",
        viewActive: "צפייה בפרסום המשרה הרשמי",
        yourRoadmap: "מפת הדרכים שלך זמינה כעת",
        roleAnalysis: "ניתוח התאמה לתפקיד",
        differentiators: "יתרונות תחרותיים ייחודיים",
        guidelines: "עמודי תווך לצמיחה אסטרטגית",
        refinedResume: "תמצית מקצועית ל-2026",
        copySuccess: "הועתק ללוח!"
      }
    }
  }
}
});

export default i18n;
