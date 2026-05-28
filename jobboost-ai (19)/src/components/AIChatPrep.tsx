import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Info,
  ChevronLeft,
  ChevronRight,
  Brain,
  MessageSquare,
  Award,
  ArrowDown,
  Mic,
  MicOff
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface AIChatPrepProps {
  question: string;
  strategyReason: string;
  isHebrew: boolean;
  onExit: () => void;
}

// 1. High Performance Memoized Message Item Component
// This prevents expensive list re-renders on every keystroke when the user types in the text area!
const MemoizedMessageItem = React.memo(({ message }: { message: Message }) => {
  const isAI = message.role === "assistant";
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex w-full ${isAI ? "justify-start" : "justify-end"} mb-4`}
    >
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-[1.8rem] px-5 py-4 md:px-7 md:py-4.5 shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-line border ${
          isAI
            ? "bg-white dark:bg-stone-950 border-stone-100/80 dark:border-stone-800 text-stone-800 dark:text-stone-100 rounded-tl-sm"
            : "bg-stone-900 border-stone-900 dark:border-amber-400 dark:bg-amber-400 text-white dark:text-stone-900 rounded-tr-sm font-medium"
        }`}
      >
        {message.text}
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the core content details change
  return prevProps.message.id === nextProps.message.id && prevProps.message.text === nextProps.message.text;
});

MemoizedMessageItem.displayName = "MemoizedMessageItem";

export function AIChatPrep({ question, strategyReason, isHebrew, onExit }: AIChatPrepProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  // SpeechRecognition status states
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSpeechSupported = typeof window !== 'undefined' && 
    (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);

  const startListening = () => {
    if (!isSpeechSupported) return;

    setSpeechError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = isHebrew ? "he-IL" : "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      setInputValue((prev) => {
        const space = prev && !prev.endsWith(" ") ? " " : "";
        return prev + space + transcript;
      });
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === "not-allowed") {
        setSpeechError(
          isHebrew 
            ? "גישה למיקרופון נדחתה. יש לאשר הרשאת מיקרופון בדפדפן." 
            : "Microphone access denied. Please enable microphone permissions in your browser."
        );
      } else {
        setSpeechError(
          isHebrew
            ? `שגיאת מיקרופון: ${event.error}`
            : `Microphone error: ${event.error}`
        );
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start SpeechRecognition:", err);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Failed to stop SpeechRecognition:", err);
      }
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Safe cleaning phase on component lifecycle end
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Evaluation score state from the latest AI reply
  const [evaluationScore, setEvaluationScore] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFallbackActive, setIsFallbackActive] = useState(false);

  // Floating button state for when new messages arrive while user is scrolled up
  const [showScrollBottomIndicator, setShowScrollBottomIndicator] = useState(false);

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Maximum characters allowed
  const maxChars = 1000;

  // Set up the welcoming message when the component mounts
  useEffect(() => {
    const welcomeId = `msg-welcome-${Date.now()}`;
    const initialText = isHebrew
      ? `שלום! אני המראיין הווירטואלי שלך ב-Joboost. בוא נתרגל את השאלה המרכזית הזו:

"${question}"

כתוב את התשובה שלך כאן למטה, ואני אנתח אותה, אתן לך ציון והצעות לשיפור, ונמשיך בשאילת שאלות עוקבות!`
      : `Hello! I'm your Joboost virtual interviewer. Let's practice this key question:

"${question}"

Write your response below. I will analyze your answer, give you a score and targeted suggestions, and guide you with follow-up questions!`;

    setMessages([
      {
        id: welcomeId,
        role: "assistant",
        text: initialText
      }
    ]);
  }, [question, isHebrew]);

  // Handle dynamic expand/shrink auto-sizing of text area
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputValue]);

  // 2. Smart scroll to bottom algorithm with scrolled-up protection
  const isUserScrolledUp = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return false;
    const threshold = 180; // pixel tolerance for bottom
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom > threshold;
  }, []);

  const forceScrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    setShowScrollBottomIndicator(false);
  }, []);

  // Monitor container scroll behavior to show/hide the ambient "Go to bottom" floating pill
  const handleScrollEvent = useCallback(() => {
    if (isUserScrolledUp()) {
      setShowScrollBottomIndicator(true);
    } else {
      setShowScrollBottomIndicator(false);
    }
  }, [isUserScrolledUp]);

  // Handle scrolling when messages list or loading indicators change
  useEffect(() => {
    // If user is near the bottom, or if the latest message is a user message, scroll automatically!
    const lastMsgIsUser = messages.length > 0 && messages[messages.length - 1].role === "user";
    
    if (lastMsgIsUser || !isUserScrolledUp()) {
      // Force scroll
      setTimeout(() => {
        forceScrollToBottom();
      }, 80);
    } else {
      // If user is scrolled up and AI just replied, show user the alert indicator
      setShowScrollBottomIndicator(true);
    }
  }, [messages.length, isSending, isUserScrolledUp, forceScrollToBottom]);

  // Handle key triggers inside textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Dispatch outgoing interactive message and fetch evaluations
  const handleSend = async () => {
    const cleanInput = inputValue.trim();
    if (!cleanInput || isSending) return;

    if (cleanInput.length > maxChars) return;

    setErrorStatus(null);
    const userMsgId = `msg-user-${Date.now()}`;
    const updatedMessages = [
      ...messages,
      { id: userMsgId, role: "user" as const, text: cleanInput }
    ];

    setMessages(updatedMessages);
    setInputValue("");
    setIsSending(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s network timeout guard

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          messages: updatedMessages,
          language: isHebrew ? "he" : "en"
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-assistant-${Date.now()}`,
            role: "assistant",
            text: data.reply
          }
        ]);
        if (typeof data.score === "number" && data.score >= 0) {
          setEvaluationScore(data.score);
        }
        if (Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
        setIsFallbackActive(!!data.isFallback);
      } else {
        throw new Error("Missing content body parameters");
      }
    } catch (err: any) {
      console.warn("[Interactive Arena Client Rescue] AI reply fetch failure:", err);
      setErrorStatus(
        isHebrew 
          ? "נראה שיש בעיית תקשורת קלה. לחץ על 'נסה שוב' כדי שנמשיך בדיוק מאיפה שהפסקנו." 
          : "Encountered a temporary connection drop. Let's retry to proceed smoothly with your interview practice."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryError = () => {
    setErrorStatus(null);
    handleSend();
  };

  const charPercent = Math.min((inputValue.length / maxChars) * 100, 100);

  return (
    <div className="flex flex-col h-full min-h-[75vh] md:min-h-[85vh] bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl relative">
      
      {/* Upper Title and Header Actions bar representing the high-tech 2026 feel */}
      <div className="flex items-center justify-between px-6 py-5 md:px-8 md:py-6 bg-white dark:bg-stone-950 border-b border-stone-100 dark:border-stone-800/80 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onExit}
            className="p-2.5 bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-all text-stone-600 dark:text-stone-300 active:scale-95 cursor-pointer"
          >
            {isHebrew ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <div className="space-y-0.5">
            <h3 className="text-base md:text-lg font-black text-stone-900 dark:text-white leading-tight font-sans tracking-tight">
              {isHebrew ? "מצב סימולציית ראיונות מהפכני" : "Interactive Interview Arena"}
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[10px] md:text-xs font-bold text-stone-400 capitalize">
                {isHebrew ? "מראיין AI מבוסס 2026 פעיל" : "2026 AI mock interviewer online"}
              </p>
            </div>
          </div>
        </div>
        
        {/* Dynamic score visualization badge */}
        {evaluationScore !== null && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-stone-900 font-extrabold rounded-2xl shadow-lg shadow-amber-400/25 text-xs md:text-sm"
          >
            <Award className="w-4.5 h-4.5" />
            <span>{isHebrew ? `ציון אחרון: ${evaluationScore}/100` : `Latest Score: ${evaluationScore}/100`}</span>
          </motion.div>
        )}
      </div>

      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative">
        
        {/* Chat Scrolling viewport Area */}
        <div className="flex-1 flex flex-col justify-between relative overflow-hidden bg-stone-50 dark:bg-stone-900/40">
          
          <div 
            ref={scrollContainerRef}
            onScroll={handleScrollEvent}
            className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 max-h-[58vh] md:max-h-[64vh] scroll-smooth"
          >
            {/* List mapped and memoized correctly for infinite performance with zero frame drop */}
            {messages.map((m) => (
              <MemoizedMessageItem key={m.id} message={m} />
            ))}

            {/* Dynamic premium typing loader state */}
            {isSending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start mb-4"
              >
                <div className="bg-white dark:bg-stone-950 border border-stone-100 dark:border-stone-800 rounded-2xl px-6 py-4 flex items-center gap-2 shadow-sm">
                  <span className="w-2.5 h-2.5 bg-stone-400 dark:bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2.5 h-2.5 bg-stone-400 dark:bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2.5 h-2.5 bg-stone-400 dark:bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </motion.div>
            )}

            {/* Network or General Error banner */}
            {errorStatus && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-2xl border border-red-200/50 dark:border-red-900/30 text-sm flex items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="font-bold">{errorStatus}</p>
                </div>
                <button
                  onClick={handleRetryError}
                  className="px-4 py-2 bg-red-600 text-white font-extrabold uppercase text-xs rounded-xl hover:bg-red-700 active:scale-95 transition-all outline-none whitespace-nowrap cursor-pointer"
                >
                  {isHebrew ? "נסה שוב" : "Retry Now"}
                </button>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* User scrolled up popup arrow button */}
          <AnimatePresence>
            {showScrollBottomIndicator && (
              <motion.button
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.9 }}
                onClick={forceScrollToBottom}
                className="absolute left-1/2 transform -translate-x-1/2 bottom-4 px-4 py-2 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-900 text-xs font-black rounded-full flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all outline-none border border-stone-800 dark:border-amber-300 cursor-pointer z-10"
              >
                <span>{isHebrew ? "הודעות חדשות למטה" : "New messages below"}</span>
                <ArrowDown className="w-4 h-4 animate-bounce" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar displaying actionable Coaching recommendations and statistics dynamically */}
        <div className="w-full md:w-80 bg-stone-100/50 dark:bg-stone-950/30 border-t md:border-t-0 md:border-l border-stone-100 dark:border-stone-800/80 p-6 space-y-6 overflow-y-auto shrink-0">
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-[0.25em] text-stone-400 flex items-center gap-1.5 font-mono">
              <Brain className="w-4.5 h-4.5 text-amber-500" />
              {isHebrew ? "אסטרטגיה מומלצת" : "Original Strategy"}
            </h4>
            <div className="p-4 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl shadow-sm">
              <p className="text-xs md:text-sm text-stone-600 dark:text-stone-300 leading-relaxed italic">
                "{strategyReason}"
              </p>
            </div>
          </div>

          {/* Backup warning warning indicator */}
          {isFallbackActive && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl text-xs flex items-start gap-2.5 leading-relaxed"
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block mb-0.5">{isHebrew ? "מערכת גיבוי פעילה" : "Coaching Backup Active"}</span>
                {isHebrew 
                  ? "הפעלנו את מנוע הניתוח המקומי כדי להעניק לך פידבק אופטימלי ללא הפרעה." 
                  : "We've activated our offline analyzer, keeping your coaching feedback immediate and fully responsive."}
              </div>
            </motion.div>
          )}

          {/* Checklists recommendations pane */}
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-xs font-black uppercase tracking-[0.25em] text-stone-400 flex items-center gap-1.5 font-mono">
              <MessageSquare className="w-4.5 h-4.5 text-blue-500" />
              {isHebrew ? "הצעות לשיפור שדרוג המענה" : "Analysis & Gaps Checklist"}
            </h4>
            
            {suggestions.length > 0 ? (
              <div className="space-y-2.5">
                {suggestions.map((sug, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="flex items-start gap-2.5 p-3 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl shadow-sm text-xs leading-relaxed"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-stone-700 dark:text-stone-300 font-bold">{sug}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-5 bg-white dark:bg-stone-900 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl text-center">
                <p className="text-xs text-stone-400 leading-relaxed font-bold">
                  {isHebrew 
                    ? "הזן את תשובתך לקבלת ניתוח ציונים, הערכות חוזקות והמלצות אסטרטגיות מדויקות." 
                    : "Submit your answer first to unlock precise performance scores, strengths evaluation, and tactical checklist."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer input textarea and character circular progressive tracking */}
      <div className="p-4 md:p-6 bg-white dark:bg-stone-950 border-t border-stone-100 dark:border-stone-800/80 shrink-0">
        <div className="max-w-4xl mx-auto flex items-end gap-3.5 relative">
          
          {/* Ambient active indicators of Speech recognition floating above the input container */}
          <AnimatePresence>
            {speechError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 bottom-full mb-3 w-full p-3 bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-md backdrop-blur-sm z-20"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-bold">{speechError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSpeechError(null)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-extrabold text-xs ml-2 cursor-pointer transition-colors"
                >
                  {isHebrew ? "סגור" : "Dismiss"}
                </button>
              </motion.div>
            )}
            {isListening && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 bottom-full mb-3 w-full p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs flex items-center gap-2.5 shadow-md backdrop-blur-sm z-20"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="font-bold">
                  {isHebrew ? "הקלטה פעילה כעת... דבר אל המיקרופון." : "Recording active... Speak into the microphone."}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => {
                const incoming = e.target.value;
                if (incoming.length <= maxChars) {
                    setInputValue(incoming);
                } else {
                    setInputValue(incoming.slice(0, maxChars));
                }
              }}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              placeholder={
                isHebrew
                  ? "הקלד את תשובתך או לחץ על המיקרופון לדבר..."
                  : "Type your answer or click the microphone to speak..."
              }
              className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-2xl pl-16 pr-16 py-4 text-sm md:text-base focus:ring-2 focus:ring-stone-900 dark:focus:ring-amber-400 outline-none transition-all scrollbar-none resize-none dark:text-white max-h-[160px]"
            />
            {/* Real-time progress bar loop representation */}
            <div className="absolute right-4.5 bottom-4 flex items-center gap-1.5 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800/50 rounded-full py-0.5 px-2">
              <div className="w-3.5 h-3.5 rounded-full border border-stone-200 dark:border-stone-700 flex items-center justify-center relative">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="7"
                    cy="7"
                    r="5"
                    fill="transparent"
                    stroke={charPercent >= 90 ? "#ef4444" : "#f59e0b"}
                    strokeWidth="1.5"
                    strokeDasharray={`${2 * Math.PI * 5}`}
                    strokeDashoffset={`${2 * Math.PI * 5 * (1 - charPercent / 100)}`}
                  />
                </svg>
              </div>
              <span className={`text-[9px] font-extrabold tracking-tight ${inputValue.length >= maxChars ? "text-red-500" : "text-stone-400"}`}>
                {inputValue.length}/{maxChars}
              </span>
            </div>
          </div>

          {/* Speech-to-text integration trigger */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={isSending}
            className={`h-14 w-14 flex items-center justify-center rounded-2xl transition-all outline-none border cursor-pointer shrink-0 active:scale-95 duration-200 ${
              isListening
                ? "bg-red-500 border-red-500 text-white animate-pulse shadow-lg shadow-red-500/30 hover:bg-red-600"
                : isSpeechSupported
                ? "bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 border-stone-200/60 dark:border-stone-800 text-stone-700 dark:text-stone-200 hover:scale-[1.03]"
                : "bg-stone-50 dark:bg-stone-900 border-stone-100 dark:border-stone-850 text-stone-400 dark:text-stone-600 opacity-50 cursor-not-allowed"
            }`}
            title={
              !isSpeechSupported
                ? (isHebrew ? "זיהוי דיבור אינו נתמך בדפדפן זה" : "Speech recognition not supported in this browser")
                : isListening
                ? (isHebrew ? "הקלטה פעילה... לחץ לעצירה" : "Recording active... Click to stop")
                : (isHebrew ? "תרגל בדיבור (מיקרופון)" : "Practice by speaking (Microphone)")
            }
          >
            {isListening ? (
              <MicOff className="w-5 h-5 animate-pulse" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={handleSend}
            disabled={isSending || !inputValue.trim() || inputValue.length > maxChars}
            className="h-14 w-14 bg-stone-900 dark:bg-amber-400 hover:scale-[1.03] active:scale-95 disabled:scale-100 transition-all rounded-2xl flex items-center justify-center text-white dark:text-stone-900 shadow-xl shadow-stone-900/10 dark:shadow-amber-400/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {isSending ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Send className={`w-5 h-5 ${isHebrew ? "transform rotate-180" : ""}`} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
