import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, X, CreditCard } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  isHebrew?: boolean;
  onSuccess?: () => void;
}

export function UpgradeModal({ isOpen, onClose, userId, isHebrew = false, onSuccess }: UpgradeModalProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setError(null);

    try {
      const endpoint = "/api/payments/paddle/create-checkout";
      const token = localStorage.getItem("firebaseToken") || userId;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId, language: isHebrew ? "he" : "en" }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || (isHebrew ? "התקשרות עם שרת הסליקה נכשלה. נסה שנית." : "Payment configuration request failed. Please try again."));
      }

      const session = await response.json();
      const redirectUrl = session.checkoutUrl;

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error(isHebrew ? "שגיאה בניתוב לעמוד התשלום." : "Unable to generate payment checkout redirection.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsUpgrading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-950/85 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-white"
      >
        {/* Glow and decoration */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-60 h-60 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/10 border border-amber-400/20 rounded-xl text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-amber-500">
                {isHebrew ? "שדרוג מרוץ הקריירה" : "PRO CAREER ENHANCEMENT"}
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">
                {isHebrew ? "התחל מנוי פרימיום חכם" : "Upgrade to Pro AI Premium"}
              </h3>
            </div>
          </div>

          <p className="text-sm text-stone-300 leading-relaxed">
            {isHebrew
              ? "שדרג היום כדי לפתוח חיפושי עבודה וניתוחים מעמיקים של מנהל ה-AI. קצוב את תקציב החיפוש שלך ישירות מהמנוי."
              : "Upgrade today to query our direct AI matching engine. Your subscription funds your personal AI API budget pool."}
          </p>

          {/* Price section */}
          <div className="p-4 bg-stone-950/40 rounded-2xl border border-stone-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
                {isHebrew ? "מחיר חודשי" : "Monthly Pricing"}
              </p>
              <p className="text-2xl font-black text-white">$15 / <span className="text-xs font-normal text-stone-400">{isHebrew ? "חודש" : "mo"}</span></p>
            </div>
            <div className="text-right text-stone-400 text-xs">
              <p className="font-bold text-amber-400">API Cost Funding</p>
              <p className="text-[10px]">$5.00 assigned to your pool</p>
            </div>
          </div>

          {/* Secure Payment System Notice */}
          <div className="p-3 bg-stone-950/10 rounded-xl border border-stone-800/40 text-[10px] text-stone-400 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>
              {isHebrew
                ? "סליקה מאובטחת על ידי Paddle. תומך בכרטיסי אשראי, Apple Pay ו-PayPal באופן אוטומטי."
                : "Secured by Paddle. Supports Credit Cards, Apple Pay, and PayPal dynamically based on device compatibility."}
            </span>
          </div>

          {/* List of features */}
          <div className="space-y-3 py-1 bg-stone-950/20 p-4 rounded-2xl border border-stone-800">
            {[
              {
                he: "עד 10 חיפושי עבודה מבוססי AI בחודש קלנדרי",
                en: "Up to 10 AI-powered searches per month"
              },
              {
                he: "סנכרון מנוי מיידי ועלויות AI מנוהלות בזמן אמת",
                en: "Instant synchronization & token-based AI accounting"
              },
              {
                he: "התאמת פרופיל ועריכת קורות חיים בעדיפות עליונה",
                en: "Advanced AI profile optimization & gap matching"
              },
              {
                he: "פעיל מיידית לאחר אישור סליקה",
                en: "Instant premium activation after secure processing"
              }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <div className="mt-0.5 p-0.5 bg-amber-400/20 text-amber-400 rounded-lg">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-stone-300 text-xs font-medium select-none">
                  {isHebrew ? item.he : item.en}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
              {error}
            </p>
          )}

          {/* Action buttons */}
          <div className="space-y-3 pt-1">
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="w-full h-12 bg-amber-400 hover:bg-amber-300 text-stone-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-55 disabled:pointer-events-none"
            >
              {isUpgrading ? (
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>{isHebrew ? "שדרג כעת לפרימיום" : "Upgrade to Premium"}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              disabled={isUpgrading}
              className="w-full text-center text-stone-400 hover:text-white text-xs font-black uppercase tracking-widest py-1.5 transition-colors"
            >
              {isHebrew ? "אולי מאוחר יותר" : "Maybe Later"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
