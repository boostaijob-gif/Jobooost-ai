import React from "react";
import { 
  FileText, 
  ShieldCheck, 
  DollarSign, 
  HelpCircle, 
  ArrowLeft, 
  Check, 
  Globe, 
  Mail, 
  AlertCircle 
} from "lucide-react";

interface PolicyContainerProps {
  onClose?: () => void;
  isHebrewByDefault?: boolean;
}

export function PoliciesPage({ onClose, isHebrewByDefault = false }: PolicyContainerProps & { activeSection?: "terms" | "privacy" | "refund" | "pricing" }) {
  const [isHebrew, setIsHebrew] = React.useState(isHebrewByDefault);
  const [activeTab, setActiveTab] = React.useState<"terms" | "privacy" | "refund" | "pricing">("terms");

  // Handle URL change or default selection
  React.useEffect(() => {
    const checkQueryType = () => {
      const p = new URLSearchParams(window.location.search);
      const page = p.get("page") || "";
      const path = window.location.pathname.replace(/^\//, "");
      const val = (page || path).toLowerCase();
      
      if (val === "terms") setActiveTab("terms");
      else if (val === "privacy") setActiveTab("privacy");
      else if (val === "refund") setActiveTab("refund");
      else if (val === "pricing") setActiveTab("pricing");
    };
    checkQueryType();
    window.addEventListener("popstate", checkQueryType);
    return () => window.removeEventListener("popstate", checkQueryType);
  }, []);

  const handleTabClick = (tab: "terms" | "privacy" | "refund" | "pricing") => {
    setActiveTab(tab);
    // Maintain query parameter cleanly for routing compliance
    const p = new URLSearchParams(window.location.search);
    p.set("page", tab);
    const newUrl = `${window.location.pathname}?${p.toString()}`;
    window.history.pushState({ page: tab }, "", newUrl);
  };

  const emailContact = "calmshop24@gmail.com";

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar Nav */}
      <aside className="w-full md:w-80 bg-white dark:bg-stone-900 border-b md:border-b-0 md:border-r border-stone-200 dark:border-stone-800 p-6 md:p-8 flex flex-col gap-8 shrink-0">
        <div className="flex items-center justify-between w-full">
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 -ml-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-850 text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isHebrew ? "חזרה" : "Back"}</span>
            </button>
          )}
          
          <button
            onClick={() => setIsHebrew(!isHebrew)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-xs font-black uppercase tracking-wider transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-amber-500" />
            <span>{isHebrew ? "English" : "עברית"}</span>
          </button>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 block">
            {isHebrew ? "ניווט משפטי" : "Corporate Policy"}
          </span>
          <h2 className="text-2xl font-black tracking-tight dark:text-white">
            JobBoost AI
          </h2>
          <p className="text-xs text-stone-400 font-medium">
            {isHebrew ? "מרכז מדיניות ואימות ספק תשלומים" : "Legal Trust Center & Payment Disclosures"}
          </p>
        </div>

        <nav className="flex flex-col gap-2">
          <button
            onClick={() => handleTabClick("terms")}
            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-sm font-bold ${
              activeTab === "terms"
                ? "bg-stone-900 text-white dark:bg-amber-400 dark:text-stone-900 shadow-md"
                : "text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800/50 hover:text-stone-700"
            }`}
          >
            <FileText className="w-5 h-5 shrink-0" />
            <span className="truncate">{isHebrew ? "תנאי שימוש" : "Terms of Service"}</span>
          </button>

          <button
            onClick={() => handleTabClick("privacy")}
            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-sm font-bold ${
              activeTab === "privacy"
                ? "bg-stone-900 text-white dark:bg-amber-400 dark:text-stone-900 shadow-md"
                : "text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800/50 hover:text-stone-700"
            }`}
          >
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span className="truncate">{isHebrew ? "מדיניות פרטיות" : "Privacy Policy"}</span>
          </button>

          <button
            onClick={() => handleTabClick("refund")}
            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-sm font-bold ${
              activeTab === "refund"
                ? "bg-stone-900 text-white dark:bg-amber-400 dark:text-stone-900 shadow-md"
                : "text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800/50 hover:text-stone-700"
            }`}
          >
            <DollarSign className="w-5 h-5 shrink-0" />
            <span className="truncate">{isHebrew ? "מדיניות החזרים" : "Refund Policy"}</span>
          </button>

          <button
            onClick={() => handleTabClick("pricing")}
            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-sm font-bold ${
              activeTab === "pricing"
                ? "bg-stone-900 text-white dark:bg-amber-400 dark:text-stone-900 shadow-md"
                : "text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800/50 hover:text-stone-700"
            }`}
          >
            <HelpCircle className="w-5 h-5 shrink-0" />
            <span className="truncate">{isHebrew ? "תוכנית ותמחור" : "Pricing Page"}</span>
          </button>
        </nav>

        <div className="mt-auto pt-8 border-t border-stone-100 dark:border-stone-800 hidden md:block space-y-3">
          <p className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
            {isHebrew ? "צריך עזרה?" : "Need Assistance?"}
          </p>
          <a
            href={`mailto:${emailContact}`}
            className="flex items-center gap-2 text-xs text-amber-500 hover:underline font-bold"
          >
            <Mail className="w-4 h-4" />
            <span>{emailContact}</span>
          </a>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 p-8 md:p-16 max-w-4xl overflow-y-auto">
        {activeTab === "terms" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <span className="text-amber-500 text-xs font-black uppercase tracking-widest">
                {isHebrew ? "הסכם משתמש" : "User Agreement"}
              </span>
              <h1 className="text-4xl font-black tracking-tight mt-2 text-stone-900 dark:text-white">
                {isHebrew ? "תנאי שימוש (Terms of Service)" : "Terms of Service"}
              </h1>
              <p className="text-stone-400 text-xs mt-1 font-mono">
                {isHebrew ? "עודכן לאחרונה: 27 במאי 2026" : "Last Updated: May 27, 2026"}
              </p>
            </div>

            {isHebrew ? (
              <div className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed space-y-6">
                <p>
                  ברוכים הבאים ל-<strong>JobBoost AI</strong>. גישה לשירותים שלנו ושימוש בהם מהווים הסכמה לתנאים המפורטים להלן. אנא קרא אותם בעיון רב לפני רכישת מנוי או הפעלת ה-AI.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">1. תיאור השירות</h3>
                <p>
                  JobBoost AI היא פלטפורמה מבוססת בינה מלאכותית המציעה מיטוב והתאמת קורות חיים, ניתוחי שוק צמיחה, וכלים לסימולציית ראיונות עבודה. השירות נועד לסייע למחפשי עבודה בלבד, ואינו מהווה התחייבות או ערובה כלשהי לקבלה לעבודה או למציאת משרה.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">2. מודל מנויים ותשלומים</h3>
                <p>
                  השימוש בשירותי הפרימיום של JobBoost AI כרוך ברכישת מנוי חודשי מתחדש בעלות של <strong>$15.00 USD לחודש</strong> (או שווה ערך במטבע המקומי). מנוי זה מעניק למשתמש גישה לתקציב AI קשיח בגובה של $5.00, המשמש למימון ישיר של שאילתות ואינטראקציות עם מנועי שפה מתקדמים.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>חידוש אוטומטי:</strong> המנוי מתחדש מדי חודש באופן אוטומטי אלא אם כן בוטל על ידי המשתמש לפני מועד החידוש.</li>
                  <li><strong>מעבד תשלומים:</strong> כל התשלומים, החיובים וניהול המנויים מבוצעים באופן מאובטח באמצעות <strong>Paddle</strong>, שהינו ה-Merchant of Record הרשמי שלנו.</li>
                </ul>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">3. שימושי בינה מלאכותית ומגבלות קשיחות</h3>
                <p>
                  כחלק ממדיניות שימוש הוגן ואחריות פיננסית, כל מנוי פרימיום מקבל תקציב ייעודי השווה ל-33% מעלות המנוי ($5.00 USD) לטובת מנועי ה-AI. במקרה של ניצול מלא של תקציב זה, תיתכן השבתה קלה של המענה עד לחידוש המנוי או רכישת אשראי נוסף.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">4. הגבלת אחריות שירות</h3>
                <p>
                  פלטפורמת JobBoost AI, מנהליה ונציגיה, לא יישאו באחריות לכל נזק ישיר, עקיף או מקרי הנובע מחוסר היכולת להשתמש בשירות, שגיאות במענה ה-AI, או כל תוצאה של הגשת קורות חיים בהתבסס על המלצותינו.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">5. ביטול מנוי</h3>
                <p>
                  המשתמש רשאי לבטל את המנוי בכל עת בקלות דרך עמוד ה"הגדרות" במערכת או על ידי פנייה למייל התמיכה הרשמי: <a href={`mailto:${emailContact}`} className="text-amber-500 hover:underline">{emailContact}</a>. הביטול ייכנס לתוקף בתום תקופת החיוב הנוכחית, ולא יחושבו חיובים נוספים לאחר מכן.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">6. חוק ומקום שיפוט</h3>
                <p>
                  על תנאים אלה יחולו חוקי מדינת ישראל, וכל סכסוך משפטי שיתעורר יידון באופן בלעדי בבתי המשפט המוסמכים במחוז תל אביב-יפו.
                </p>
              </div>
            ) : (
              <div className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed space-y-6">
                <p>
                  Welcome to <strong>JobBoost AI</strong>. By accessing or using our platform, you agree to be bound by these Terms of Service. Please review them carefully before making any purchases or utilizing the artificial intelligence tools.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">1. Overview of Services</h3>
                <p>
                  JobBoost AI provides an advanced cloud-based artificial intelligence platform that assists professionals with resume matching, strategic job market analytics, and interactive mock interview training. We provide tools to help you prepare; however, we do not guarantee employment, placements, or successful matches.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">2. Subscription Model & Billing</h3>
                <p>
                  Our premium high-performance intelligence tools require an active paid subscription:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Premium Subscription Fee:</strong> $15.00 USD per month (or local currency equivalent).</li>
                  <li><strong>Recurring Billing:</strong> Subscriptions are auto-renewing each month. You can cancel at any time under your Profile Settings.</li>
                  <li><strong>Merchant of Record:</strong> All subscription agreements, billing authorizations, and compliance are managed by <strong>Paddle</strong>, our authorized reseller and official Merchant of Record.</li>
                </ul>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">3. Fair Use & Dedicated AI Cost Pool</h3>
                <p>
                  For sustainability and transparent pricing, $5.00 USD of your monthly subscription is converted directly into a dedicated AI API funding pool. Requests are billed per token output. Exhausting this cost pool entirely may place the account on temporary query pause until the next billing interval, or until additional consumption limits are manually established.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">4. Disclaimers & Limitation of Liability</h3>
                <p>
                  The JobBoost AI services are provided "as-is" without warranty. Under no circumstances shall JobBoost AI or its developers be liable for any direct, indirect, incidental, or consequential damages resulting from resume optimization decisions, interview feedback, or third-party recruitment interactions.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">5. Cancellation Terms</h3>
                <p>
                  You are free to terminate your subscription at any time without fees or penalties. Cancellation can be completed with a single click in your Settings dashboard, or by reaching out to our support hub at <a href={`mailto:${emailContact}`} className="text-amber-500 hover:underline">{emailContact}</a>.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">6. Governing Law</h3>
                <p>
                  These Terms of Service are governed by and construed in accordance with the laws of Israel. Any disputes arise shall be submitted exclusively to the competent courts of Tel Aviv, Israel.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <span className="text-amber-500 text-xs font-black uppercase tracking-widest">
                {isHebrew ? "הבטחת פרטיות" : "Data Safety"}
              </span>
              <h1 className="text-4xl font-black tracking-tight mt-2 text-stone-900 dark:text-white">
                {isHebrew ? "מדיניות פרטיות (Privacy Policy)" : "Privacy Policy"}
              </h1>
              <p className="text-stone-400 text-xs mt-1 font-mono">
                {isHebrew ? "עודכן לאחרונה: 27 במאי 2026" : "Last Updated: May 27, 2026"}
              </p>
            </div>

            {isHebrew ? (
              <div className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed space-y-6">
                <p>
                  ב-<strong>JobBoost AI</strong>, אנו מייחסים חשיבות עליונה לשמירה ועל אבטחת המידע האישי שלך. מסמך זה מפרט איזה מידע אנו אוספים וכיצד אנו מעבדים ומגינים עליו.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">1. מידע שנאסף על ידנו</h3>
                <p>
                  כדי לספק את התאמות המשרות הטובות ביותר, אנו עשויים לדרוש את הפרטים הבאים:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>פרטי זיהוי בסיסיים:</strong> כתובת דוא"ל, שם מלא, מספר טלפון וכתובת מגורים לצורך הפרופיל והתראות משרות.</li>
                  <li><strong>פרטי קורות חיים והיסטוריית תעסוקה:</strong> כל מידע שתבחר להעלות או להקליד במערכת (טכנולוגיות, תארים, ניסיון מקצועי).</li>
                  <li><strong>נתוני שימוש במערכת:</strong> שאילתות צ'אט, חיפושים ומשוב שנשלחים למערכת.</li>
                </ul>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">2. שמירת ונשיאת נתונים</h3>
                <p>
                  כל המידע האישי שלך נשמר בצורה מוצפנת ומאובטחת באמצעות בסיס הנתונים <strong>Firebase Firestore</strong>. נתוני התשלומים והאשראי מאוחסנים ומטופלים באופן בלעדי על ידי <strong>Paddle</strong>, ואינם נחשפים לשרתים או הכלים שלנו.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">3. שיתוף מידע עם צדדים שלישיים</h3>
                <p>
                  <strong>איננו מוכרים, משכירים או משתפים את פרטי קורות החיים והמידע האישי שלך עם חברות פרסום או גורמים מסחריים כלשהם.</strong> המידע שלך עשוי להיות מועבר לשרתי ה-API הרשמיים של Google (Gemini API) לצורך ביצוע ניתוחי התאמה, תחת הסכמי סודיות קפדניים שאינם משתמשים במידע לאימון מודלים ציבוריים.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">4. זכות המחיקה (הזכות להישכח)</h3>
                <p>
                  המשתמש זכאי למחוק את החשבון שלו לצמיתות בכל עת. מחיקת החשבון מה-Settings תסיר באופן מיידי ואטומי את כל קורות החיים, הניתוחים והפרטים האישיים שלו מההגדרות ועד לבסיס הנתונים השמור. לפניות בנושא הסרת נתונים, פנה לכתובת <a href={`mailto:${emailContact}`} className="text-amber-500 hover:underline">{emailContact}</a>.
                </p>
              </div>
            ) : (
              <div className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed space-y-6">
                <p>
                  At <strong>JobBoost AI</strong>, we care deeply about safeguarding your personal data. This Privacy Policy details what information we collect, how it is handled, and our unwavering commitment to security.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">1. Information We Collect</h3>
                <p>
                  To deliver a modern, personalized, high-frequency job match experience, we may collect:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Identity Records:</strong> Name, contact email, phone, and safe geometric location variables.</li>
                  <li><strong>Professional Archives:</strong> Resume texts, uploaded documentation containing employment histories, technology tags, and custom capabilities.</li>
                  <li><strong>AI Prompts:</strong> Text messages exchanged with the mock interview simulation and keyword optimization modules.</li>
                </ul>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">2. Data Storage & Hosting Security</h3>
                <p>
                  Your profile and match archives are securely hosted, encrypted, and isolated in cloud databases powered by <strong>Firebase Firestore</strong>. Sensitive physical payment data (e.g., Credit Card numbers) is completely routed to and safely stored by <strong>Paddle</strong> as our Merchant of Record under rigorous PCI-DSS compliance frameworks. We never see or store your payment details.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">3. Zero-Selling Data Disclosures</h3>
                <p>
                  <strong>We do not sell, barter, or transfer your resume data, contact info, or analysis logs to any advertising networks.</strong> Your documents are safely tokenized and processed via private Google Cloud Enterprise endpoints (specifically Google Gemini API) solely to execute keyword and semantic alignment calculations. No user data is retained for training public, non-isolated models.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">4. Rights of Erasure</h3>
                <p>
                  You own your data. You may delete your account permanently directly via your settings screen. Doing so triggers an atomic delete rule across all profiles, saved analysis blocks, and historical insights from our Firebase servers. For direct queries, reach out to us at <a href={`mailto:${emailContact}`} className="text-amber-500 hover:underline">{emailContact}</a>.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "refund" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <span className="text-amber-500 text-xs font-black uppercase tracking-widest">
                {isHebrew ? "מדיניות החזרים" : "Subscription Guarantee"}
              </span>
              <h1 className="text-4xl font-black tracking-tight mt-2 text-stone-900 dark:text-white">
                {isHebrew ? "מדיניות החזרים (Refund Policy)" : "Refund Policy"}
              </h1>
              <p className="text-stone-400 text-xs mt-1 font-mono">
                {isHebrew ? "עודכן לאחרונה: 27 במאי 2026" : "Last Updated: May 27, 2026"}
              </p>
            </div>

            {isHebrew ? (
              <div className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed space-y-6">
                <p>
                  אנו שואפים לספק את השירות המקצועי והמתקדם ביותר. עם זאת, אם אינך מרוצה מ-JobBoost AI, אנו מציעים תנאי החזר הוגנים וברורים.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">1. החזר כספי תוך 14 יום</h3>
                <p>
                  כל רוכש מנוי פרימיום חודשי חדש זכאי לדרוש החזר כספי מלא תוך <strong>14 ימים</strong> ממועד ביצוע החיוב המקורי, ללא צורך במתן הסברים מורכבים.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">2. תנאים לזכאות להחזר</h3>
                <p>
                  כדי לשמור על יציבות השירות ולמנוע ניצול לרעה של משאבי מחשוב הבינה המלאכותית שלנו, חלות המגבלות הבאות:
                </p>
                <div className="p-5 bg-stone-100 dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 flex items-start gap-4 text-xs font-semibold leading-relaxed">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    ההחזר יינתן בתנאי שהמשתמש השתמש בפחות מ-<strong>3 חיפושי משרות מתקדמים</strong> או מנות ניתוח AI מאז החיוב, על מנת לכסות עלויות שרתים מותאמות אישית.
                  </div>
                </div>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">3. כיצד להגיש בקשה להחזר</h3>
                <p>
                  כדי לקבל את ההחזר הכספי שלך, אנא פנה אלינו במייל:
                </p>
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 dark:bg-amber-400/5 border border-amber-500/20 rounded-2xl w-fit">
                  <Mail className="w-4 h-4 text-amber-500" />
                  <a href={`mailto:${emailContact}`} className="font-bold text-amber-500 hover:underline">{emailContact}</a>
                </div>
                <p className="text-xs text-stone-400 mt-2">
                  יש לציין בבקשה את כתובת המייל איתה נרשמת למערכת ואת מספר אישור ההזמנה שקיבלת מ-Paddle. הזיכוי יבוצע ישירות לחשבון הבנק או לכרטיס האשראי המקורי תוך 5 עד 10 ימי עסקים.
                </p>
              </div>
            ) : (
              <div className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed space-y-6">
                <p>
                  We aim to provide a high-quality job search platform. However, if you feel that JobBoost AI is not the right fit for your career progression, we offer a transparent, user-friendly Refund Policy.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">1. 14-Day Money-Back Guarantee</h3>
                <p>
                  New paid subscribers are fully protected by a <strong>14-day refund window</strong> from the date of the primary purchase transaction. You can request a complete reversal of your charge if you are unsatisfied.
                </p>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">2. Eligibility & Fair Use Guidelines</h3>
                <p>
                  Because we pay third-party high-capacity computation servers for each token generated inside your personal workspace, we ask that you respect the fair-use threshold:
                </p>
                <div className="p-5 bg-stone-100 dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 flex items-start gap-4 text-xs font-semibold leading-relaxed">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    To be eligible for a refund, the account must have consumed less than <strong>3 processed premium AI matches or analysis operations</strong>. This allows us to cover raw compute costs.
                  </div>
                </div>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white mt-6">3. Processing Your Refund</h3>
                <p>
                  To request your refund, write directly to our financial handling team at:
                </p>
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 dark:bg-amber-400/5 border border-amber-500/20 rounded-2xl w-fit">
                  <Mail className="w-4 h-4 text-amber-500" />
                  <a href={`mailto:${emailContact}`} className="font-bold text-amber-500 hover:underline">{emailContact}</a>
                </div>
                <p className="text-stone-400 text-xs mt-2">
                  Please provide your login email address and the transaction ID from your <strong>Paddle</strong> receipt. Approved refunds will be reversed to the original payment method automatically within 5 to 10 standard business days.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "pricing" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <span className="text-amber-500 text-xs font-black uppercase tracking-widest">
                {isHebrew ? "מדיניות תמחור שקופה" : "Fair Pricing Tiers"}
              </span>
              <h1 className="text-4xl font-black tracking-tight mt-2 text-stone-900 dark:text-white">
                {isHebrew ? "תוכנית ותמחור (Pricing Page)" : "Our Pricing Tiers"}
              </h1>
              <p className="text-stone-400 text-xs mt-1 font-mono">
                {isHebrew ? "עודכן לאחרונה: 27 במאי 2026" : "Last Updated: May 27, 2026"}
              </p>
            </div>

            {/* Pricing Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {/* Free Plan */}
              <div className="p-8 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-stone-400 block mb-1">
                      {isHebrew ? "חינם למשתמשי בטא" : "STARTUP TIER"}
                    </span>
                    <h3 className="text-2xl font-black dark:text-white">
                      {isHebrew ? "תוכנית חינמית" : "Free Plan"}
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-stone-900 dark:text-white">$0</span>
                    <span className="text-stone-400 text-xs font-medium">/{isHebrew ? "תמיד" : "forever"}</span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed font-semibold">
                    {isHebrew 
                      ? "גישה בסיסית ודגימת יכולת ה-AI של הפלטפורמה לחיפושים כלליים ללא תשלום." 
                      : "Basic core evaluation tools to experience JobBoost's analytical capabilities without a credit card."}
                  </p>
                </div>

                <div className="space-y-3.5 border-t border-stone-100 dark:border-stone-800 pt-6">
                  <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                    <Check className="w-4 h-4 text-stone-400 dark:text-stone-600 shrink-0" />
                    <span>{isHebrew ? "חיפוש משרות AI אחד לחודש" : "1 Smart AI Match/mo"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                    <Check className="w-4 h-4 text-stone-400 dark:text-stone-600 shrink-0" />
                    <span>{isHebrew ? "ניתוח מילות מפתח קורות חיים בסיסי" : "Basic Resume Keyword Check"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-stone-400 line-through opacity-40">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{isHebrew ? "תקציב AI קשיח ייעודי של $5.00" : "$5.00 funded AI API credits"}</span>
                  </div>
                </div>
              </div>

              {/* Premium Plan */}
              <div className="p-8 bg-stone-900 dark:bg-stone-950 rounded-[2.5rem] border-2 border-amber-400 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-amber-400 text-stone-900 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                  POPULAR
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-amber-400 block mb-1">
                      {isHebrew ? "מקצועני קריירה" : "EXECUTIVE PREMIUM"}
                    </span>
                    <h3 className="text-2xl font-black text-white">
                      {isHebrew ? "תוכנית פרימיום" : "Premium Plan"}
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">$15.00</span>
                    <span className="text-stone-400 text-xs font-medium">/{isHebrew ? "חודש" : "month"}</span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed font-semibold">
                    {isHebrew 
                      ? "חיפוש משרות תעסוקה מלא ללא מגבלות, התאמת מילות מפתח עמוקה וניתוח סימולציית ראיונות." 
                      : "Unleash continuous analysis, high-frequency intelligence filters, and mock interactive interviewing."}
                  </p>
                </div>

                <div className="space-y-3.5 border-t border-stone-800 pt-6">
                  <div className="flex items-center gap-3 text-xs text-stone-300">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{isHebrew ? "10 חיפוש משרות מונעי AI מתקדמים בחודש" : "Up to 10 Advanced AI Searches/mo"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-stone-300">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{isHebrew ? "גישה לממשק הדרכה סימולציוני" : "Full Interactive Prep Console"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-stone-300">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>$5.00</strong> {isHebrew ? "תקציב AI קשיח ייעודי לחשבון" : "Dedicated AI Cost Funding"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-stone-300">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{isHebrew ? "שירות תמיכה מהיר תוך 24 שעות" : "Prioritized Email Support"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-stone-100 dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-3 mt-12">
              <h4 className="font-bold text-stone-900 dark:text-white">
                {isHebrew ? "שקיפות מחירים מבית פאדל" : "Pricing Disclosures &Reseller Notice"}
              </h4>
              <p className="text-stone-500 dark:text-stone-400 text-xs leading-relaxed">
                {isHebrew 
                  ? "כל הרכישות מעובדות בצורה מאובטחת על ידי Paddle. Paddle הוא ה-Merchant of Record המורשה וספק השירות הבלעדי שלנו. המחיר כולל מיסים ומס ערך מוסף (מע\"מ) התואם את המיקום הגאוגרפי שלך."
                  : "Purchases made on JobBoost AI are securely processed and fulfilled by our payment services provider, Paddle (the authorized Reseller and Merchant of Record). Subscriptions can easily be paused or cancelled with zero questions asked."}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
