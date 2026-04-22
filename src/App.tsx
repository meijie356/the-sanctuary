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

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    setMessages([]); // Full reset
    setIsConfirmingClear(false);
  };

  return (
    <div className="flex h-screen w-full flex-col font-sans serene-blur lg:flex-row">
      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col relative h-full">
        
        {/* Header */}
        <header className="flex h-20 items-center justify-between px-10 border-b border-sanctuary-border bg-sanctuary-bg/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="font-serif text-lg font-medium tracking-tight">Personal Reflection</h1>
              <p className="text-[0.75rem] text-sanctuary-muted">The Sanctuary</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
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
          className="flex-1 overflow-y-auto p-6 space-y-12 max-w-4xl mx-auto w-full"
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
            {messages.map((message, index) => {
              // Calculate "freshness" for the asymmetric window
              const succeedingSameRole = messages.slice(index + 1).filter(m => m.role === message.role).length;
              const isProminent = message.role === 'user' 
                ? succeedingSameRole < 10 
                : succeedingSameRole < 3;
              
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: isProminent ? 1 : 0.4, 
                    scale: isProminent ? 1 : 0.98,
                    y: 0 
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`
                    flex max-w-[85%] sm:max-w-[75%] gap-4 
                    ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}
                    ${!isProminent && 'group/marginalia'}
                  `}>
                    <div className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500
                      ${message.role === 'user' 
                        ? (isProminent ? 'bg-sanctuary-accent border-sanctuary-accent text-white shadow-lg shadow-sanctuary-accent/20' : 'bg-sanctuary-accent/20 border-sanctuary-accent/10 text-sanctuary-accent/40')
                        : (isProminent ? 'bg-white border-sanctuary-border text-sanctuary-accent shadow-sm' : 'bg-transparent border-sanctuary-border/10 text-sanctuary-muted/30')}
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
                          ? (isProminent ? 'bg-sanctuary-accent text-white rounded-br-none' : 'bg-sanctuary-accent/5 text-sanctuary-ink/40 border border-sanctuary-accent/10 rounded-br-none italic text-sm') 
                          : (isProminent ? 'bg-white text-sanctuary-ink border border-sanctuary-border rounded-bl-none font-serif' : 'bg-transparent text-sanctuary-muted/40 border border-dashed border-sanctuary-border/20 rounded-bl-none font-serif text-sm')}
                      `}>
                        {message.text}
                      </div>
                      {isProminent && (
                        <span className="text-[10px] text-sanctuary-muted opacity-60 px-1">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
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
            <div className="bg-white border border-sanctuary-border rounded-full p-2 pl-6 flex items-center shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-shadow group-focus-within:shadow-md">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Share what's on your heart..."
                className="flex-1 bg-transparent border-none outline-none text-[1rem] placeholder:text-sanctuary-muted py-2"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`
                  w-11 h-11 rounded-full flex items-center justify-center transition-all
                  ${!input.trim() || isLoading 
                    ? 'bg-gray-100 text-gray-300' 
                    : 'bg-sanctuary-accent text-white shadow-lg shadow-sanctuary-accent/20 hover:scale-105 active:scale-95'}
                `}
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-center text-[0.7rem] text-sanctuary-muted mt-3">
              Conversations are stored in your Soul Ledger for long-term guidance.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}

