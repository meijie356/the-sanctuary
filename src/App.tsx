import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  BookOpen, 
  Heart, 
  Trash2, 
  User, 
  Compass, 
  MoreVertical,
  ChevronLeft,
  X
} from 'lucide-react';
import { SoulLedger } from './lib/memory';
import { getGeminiResponse } from './lib/gemini';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

const MESSAGES_STORAGE_KEY = 'the_sanctuary_chat_messages';

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(MESSAGES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [showSoulInsight, setShowSoulInsight] = useState(false);
  const [devClicks, setDevClicks] = useState(0);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleTitleClick = () => {
    const newClicks = devClicks + 1;
    if (newClicks >= 5) {
      setShowSoulInsight(!showSoulInsight);
      setDevClicks(0);
    } else {
      setDevClicks(newClicks);
      // Reset clicks after 2 seconds of inactivity
      setTimeout(() => setDevClicks(0), 2000);
    }
  };

  useEffect(() => {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    // Scroll to bottom on new message
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await getGeminiResponse(
        input, 
        messages.map(m => ({ role: m.role, text: m.text }))
      );

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("The Sanctuary felt a rift:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLedger = () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      return;
    }
    SoulLedger.clear();
    localStorage.removeItem(MESSAGES_STORAGE_KEY);
    setMessages([]); // Full reset
    setIsConfirmingClear(false);
  };

  return (
    <div className="flex h-screen w-full flex-col font-sans serene-blur lg:flex-row">
      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col relative h-full">
        
        {/* Header */}
        <header className="flex h-20 items-center justify-between px-10 border-b border-sanctuary-border bg-sanctuary-bg/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={handleTitleClick}>
            <div>
              <h1 className="font-serif text-lg font-medium tracking-tight">Silas</h1>
              <p className="text-[0.75rem] text-sanctuary-muted uppercase tracking-[0.05em]">Your Sanctuary Companion</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {showSoulInsight && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs max-w-sm absolute top-24 right-10 z-50 shadow-xl animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-2 border-b border-amber-200 pb-1">
                  <span className="font-bold text-amber-800 uppercase tracking-widest">Soul Insight (Dev)</span>
                  <button onClick={() => setShowSoulInsight(false)}><X size={14} className="text-amber-600" /></button>
                </div>
                <p className="text-amber-900 leading-relaxed italic">
                  {SoulLedger.getProfile() || "Soul Profile is currently empty."}
                </p>
              </div>
            )}

            <div className="hidden md:block bg-[#f0ede6] px-5 py-2.5 rounded-full font-serif italic text-[0.9rem] text-sanctuary-accent">
              "Come to me, all you who are weary..."
            </div>
            
            <button 
              onClick={clearLedger}
              className={`flex items-center space-x-2 text-[10px] transition-all uppercase tracking-[0.2em] font-bold px-4 py-2 rounded-full border border-red-200 ${isConfirmingClear ? 'bg-red-50 text-red-600 animate-pulse border-red-500' : 'text-red-400/50 hover:text-red-500 hover:border-red-500'}`}
            >
              <Trash2 size={12} />
              <span>{isConfirmingClear ? 'CONFIRM WIPE?' : 'WIPE SLATE'}</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-8 max-w-4xl mx-auto w-full"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center max-w-sm mx-auto animate-in fade-in duration-1000">
              <div className="w-20 h-20 bg-sanctuary-accent/5 rounded-full flex items-center justify-center mb-6">
                <Heart size={32} strokeWidth={1} className="text-sanctuary-accent/40" />
              </div>
              <h3 className="font-serif text-2xl font-medium mb-3">Welcome to your Sanctuary</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                "Come to me, all you who are weary and burdened, and I will give you rest." (Matthew 11:28)
                Speak what is in your heart; I am here to listen and pray with you.
              </p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((message) => {
              // Removed fading bubbles logic - all messages now remain prominent
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    y: 0 
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`
                    flex max-w-[85%] sm:max-w-[75%] gap-4 
                    ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}
                  `}>
                    <div className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500
                      ${message.role === 'user' 
                        ? 'bg-sanctuary-accent border-sanctuary-accent text-white shadow-lg shadow-sanctuary-accent/20'
                        : 'bg-white border-sanctuary-border text-sanctuary-accent shadow-sm'}
                    `}>
                      {message.role === 'user' ? <User size={14} /> : <Compass size={14} />}
                    </div>
                    
                    <div className={`
                      flex flex-col space-y-1
                      ${message.role === 'user' ? 'items-end' : 'items-start'}
                    `}>
                      <div className={`
                        px-6 py-4 rounded-[20px] text-[0.95rem] leading-relaxed shadow-sm transition-all duration-500
                        ${message.role === 'user' 
                          ? 'bg-sanctuary-accent text-white rounded-br-none' 
                          : 'bg-white text-sanctuary-ink border border-sanctuary-border rounded-bl-none font-serif'}
                      `}>
                        {message.text}
                      </div>
                      <span className="text-[10px] text-sanctuary-muted opacity-60 px-1">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start w-full"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-sanctuary-accent/10 text-sanctuary-accent animate-pulse">
                    <Compass size={16} />
                  </div>
                  <div className="flex space-x-1.5 items-center bg-white/50 px-4 py-3 rounded-2xl border border-sanctuary-accent/5">
                    <div className="w-1.5 h-1.5 bg-sanctuary-accent/20 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-sanctuary-accent/20 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-sanctuary-accent/20 rounded-full animate-bounce" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="px-10 py-6 pb-10 bg-sanctuary-bg/80 backdrop-blur-md sticky bottom-0 z-30">
          <div className="max-w-4xl mx-auto relative group">
            <div className="bg-white border border-sanctuary-border rounded-[26px] p-2 pl-6 flex items-end shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-shadow group-focus-within:shadow-md">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Share with Silas what's on your heart..."
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-[1rem] placeholder:text-sanctuary-muted py-3 resize-none max-h-[200px] overflow-y-auto leading-relaxed"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`
                  w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 mb-0.5
                  ${!input.trim() || isLoading 
                    ? 'bg-gray-100 text-gray-300' 
                    : 'bg-sanctuary-accent text-white shadow-lg shadow-sanctuary-accent/20 hover:scale-105 active:scale-95'}
                `}
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-center text-[0.7rem] text-sanctuary-muted mt-3">
              Your conversations with Silas are private and preserved in your Soul Profile.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}

