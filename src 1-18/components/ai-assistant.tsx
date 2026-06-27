'use client';

import { useStore } from '@/lib/store';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Sparkles, Crown, Send, X, SlidersHorizontal, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  filters?: Record<string, string> | null;
}

const QUICK_STARTS = [
  { label: 'Birthday Gift', message: 'I need a birthday gift suggestion' },
  { label: 'Anniversary Gift', message: 'Help me find an anniversary gift' },
  { label: 'Corporate Gift', message: 'I need corporate gift ideas for clients' },
  { label: 'Under ₹2000', message: 'Show me great gifts under ₹2000' },
];

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<Record<string, string> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setGiftFilter, setView, clearGiftFilter } = useStore();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Show welcome message when chat opens for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content:
            "Welcome to 3 BOXES AI! 👑 I'm your personal luxury gift advisor. Tell me about the occasion, who you're gifting to, and your budget — I'll find the perfect match for you!",
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setPendingFilters(null);

    try {
      const history = newMessages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      const data = await res.json();
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.reply,
        filters: data.filters,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (data.filters) {
        setPendingFilters(data.filters);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    if (!pendingFilters) return;
    clearGiftFilter();
    setGiftFilter({
      occasion: pendingFilters.occasion || null,
      recipient: pendingFilters.recipient || null,
      relationship: pendingFilters.relationship || null,
      priceRange: pendingFilters.priceRange || null,
      category: pendingFilters.category || null,
    });
    setView('home');
    setIsOpen(false);
    setPendingFilters(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickStart = (message: string) => {
    sendMessage(message);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-transform hover:scale-110 hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] active:scale-95 sm:bottom-8 sm:right-8"
            aria-label="Open AI Gift Assistant"
          >
            <Sparkles className="h-6 w-6 text-stone-950" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-4 right-4 z-50 flex h-[min(600px,85vh)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-amber-900/40 bg-stone-950 shadow-[0_0_60px_rgba(0,0,0,0.6)] sm:bottom-6 sm:right-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-900/30 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-700">
                  <Crown className="h-4 w-4 text-stone-950" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide text-amber-100">
                    3 BOXES AI
                  </h3>
                  <p className="text-[10px] font-medium text-amber-500/60">
                    Luxury Gift Advisor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-amber-200/40 transition-colors hover:bg-stone-800 hover:text-amber-200"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-stone-950 shadow-[0_2px_10px_rgba(245,158,11,0.2)]'
                          : 'border border-amber-900/20 bg-stone-900/80 text-amber-100/90'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1.5 rounded-2xl border border-amber-900/20 bg-stone-900/80 px-4 py-3">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500/70" />
                      <span className="text-[12px] text-amber-200/40">
                        Thinking...
                      </span>
                    </div>
                  </div>
                )}

                {/* Apply Filters Button */}
                {pendingFilters && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <button
                      onClick={applyFilters}
                      className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all hover:border-amber-500/60 hover:bg-amber-500/20 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Apply Filters & View Gifts
                    </button>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Quick Start Buttons */}
            {messages.length <= 1 && !isLoading && (
              <div className="border-t border-amber-900/15 px-4 py-2.5">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-amber-200/30">
                  Quick Start
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_STARTS.map((qs) => (
                    <button
                      key={qs.label}
                      onClick={() => handleQuickStart(qs.message)}
                      className="rounded-full border border-amber-900/25 bg-stone-900/60 px-3 py-1.5 text-[11px] font-medium text-amber-200/50 transition-all hover:border-amber-700/40 hover:bg-stone-800/80 hover:text-amber-200/80"
                    >
                      {qs.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-amber-900/30 bg-stone-900/30 px-3 py-2.5"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your ideal gift..."
                disabled={isLoading}
                className="flex-1 rounded-lg border border-amber-900/20 bg-stone-900/60 px-3 py-2 text-[13px] text-amber-100 placeholder:text-amber-200/25 focus:border-amber-600/40 focus:outline-none focus:ring-1 focus:ring-amber-600/30 disabled:opacity-50"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 shadow-[0_2px_10px_rgba(245,158,11,0.2)] hover:from-amber-400 hover:to-amber-600 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
