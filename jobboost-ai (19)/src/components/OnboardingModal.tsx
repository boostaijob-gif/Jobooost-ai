import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, Cpu, Compass, X, ChevronRight, Check } from "lucide-react";

interface OnboardingModalProps {
  isHebrew?: boolean;
}

export function IntroOnboardingModal({ isHebrew = false }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const isCompleted = localStorage.getItem("joboost_onboarding_complete");
    if (!isCompleted) {
      // Trigger modal open for first-time visitors
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500); // Friendly layout entrance delay
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("joboost_onboarding_complete", "true");
    localStorage.setItem("onboardingCompleted", "true");
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentSlide < 2) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  const slides = [
    {
      icon: <FileText className="w-8 h-8 text-amber-500" />,
      titleHe: "העלאת קורות חיים מדויקת",
      titleEn: "Drop Your Resume",
      descHe: "המערכת שלנו קוראת ומנתחת את הניסיון המקצועי שלך ללא העמסה של מילות באזז חסרות משמעות. ניתוח חד, נקי וממוקד.",
      descEn: "We ingest and analyze your raw professional background without generic buzzword stuffing. Sharp, clean, and highly focused processing.",
    },
    {
      icon: <Cpu className="w-8 h-8 text-amber-500" />,
      titleHe: "התאמה סמנטית נטולת פשרות",
      titleEn: "Zero-Slop Semantic Matching",
      descHe: "אנו מעריכים וממפים בצורה מתמטית תחומי מומחיות טכנולוגית, רמות בכירות (Seniority), וסימני השפעה במקום לזרוק אותך לאינדקסים כלליים.",
      descEn: "We mathematically map technologies, seniority tier thresholds, and active impact indicators instead of dumping you into low-fidelity generic boards.",
    },
    {
      icon: <Compass className="w-8 h-8 text-amber-500" />,
      titleHe: "ניתוח מורחב ואופטימיזציה",
      titleEn: "Profile Gap-Analysis",
      descHe: "במקום דרישות ללא מוצא, אנו מספקים מפת דרכים מעשית לפיתוח אישי ותיקון פערים בהתאם למדדים התחרותיים ביותר בשוק הנוכחי.",
      descEn: "If an exact match isn't found, the system immediately delivers a granular career trajectory map to bypass filtering thresholds.",
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-[2.5rem] p-6 md:p-10 text-white shadow-2xl overflow-hidden z-10"
        >
          {/* Close corner icon */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Interactive Slide Flow */}
          <div className="space-y-8" dir={isHebrew ? "rtl" : "ltr"}>
            {/* Slide Header Indicator */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-stone-800 rounded-2xl flex items-center justify-center shadow-inner">
                {slides[currentSlide].icon}
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                  {isHebrew ? `שלב ${currentSlide + 1} מתוך 3` : `Step ${currentSlide + 1} of 3`}
                </span>
                <h4 className="text-sm font-bold text-stone-300">
                  {isHebrew ? "היכרות מהירה" : "Platform Trajectory"}
                </h4>
              </div>
            </div>

            {/* Slide Title & Narrative Section */}
            <div className="space-y-3 min-h-[140px]">
              <h3 className="text-xl md:text-2xl font-black text-white leading-tight tracking-tight">
                {isHebrew ? slides[currentSlide].titleHe : slides[currentSlide].titleEn}
              </h3>
              <p className="text-xs md:text-sm text-stone-400 leading-relaxed font-medium">
                {isHebrew ? slides[currentSlide].descHe : slides[currentSlide].descEn}
              </p>
            </div>

            {/* Pagination Navigation Dots */}
            <div className="flex items-center justify-between border-t border-stone-800 pt-6">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((slideIdx) => (
                  <button
                    key={slideIdx}
                    onClick={() => setCurrentSlide(slideIdx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      currentSlide === slideIdx ? "w-6 bg-amber-400" : "w-1.5 bg-stone-700"
                    }`}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {currentSlide > 0 && (
                  <button
                    onClick={handlePrev}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-stone-400 hover:text-white transition-all cursor-pointer"
                  >
                    {isHebrew ? "הקודם" : "Back"}
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  className="px-5 py-2.5 bg-amber-400 text-stone-950 hover:bg-amber-300 font-black text-xs uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1 cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  {currentSlide === 2 ? (
                    <>
                      {isHebrew ? "מתחילים" : "Get Started"}
                      <Check className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      {isHebrew ? "המשך" : "Next"}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
