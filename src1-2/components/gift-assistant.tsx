'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Gift, Send, X, MessageCircle, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { getProxiedImageUrl } from '@/lib/image-utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: Array<{
    id: string;
    name: string;
    price: number;
    image: string | null;
    category: string;
    rating: number;
  }>;
  timestamp: Date;
}

const QUICK_SUGGESTIONS = [
  { label: 'Birthday gift', icon: '🎂', query: 'I need a birthday gift' },
  { label: 'Anniversary', icon: '💕', query: 'Suggest an anniversary gift' },
  { label: 'Under $100', icon: '💰', query: 'Show me gifts under $100' },
  { label: 'For Him', icon: '👔', query: 'Gift ideas for him' },
  { label: 'For Her', icon: '💐', query: 'Gift ideas for her' },
];

export function GiftAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Welcome to 3 BOXES AI Gift Assistant! ✨ I'll help you find the perfect luxury gift. Tell me about the occasion, recipient, and budget — or just describe what you're looking for!",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectProduct = useStore((s) => s.selectProduct);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gift-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message || 'I found some great options for you!',
        products: data.products || [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          "I'm sorry, I had trouble processing your request. Please try again or browse our collection directly!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickSuggestion = (query: string) => {
    sendMessage(query);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-600/30 hover:shadow-amber-500/40 transition-shadow"
            aria-label="Open Gift Assistant"
          >
            <Gift className="h-6 w-6 text-stone-950" />
            <motion.div
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-300"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="h-3 w-3 text-amber-800" />
            </motion.div>
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
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-amber-900/40 bg-stone-950 shadow-2xl shadow-amber-900/20 sm:h-[580px] sm:w-[420px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-900/30 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700">
                  <Sparkles className="h-4.5 w-4.5 text-stone-950" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-100">3 BOXES AI</h3>
                  <p className="text-[10px] text-amber-400/70">Gift Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-amber-200/50 transition-colors hover:bg-amber-900/20 hover:text-amber-200"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-amber-900/30 scrollbar-track-transparent">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-amber-600/90 text-stone-950 rounded-br-md'
                        : 'bg-stone-900/80 text-amber-100/90 border border-amber-900/20 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Product recommendations */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.products.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => {
                              selectProduct(product.id);
                              setIsOpen(false);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl bg-stone-800/80 border border-amber-900/30 p-2 text-left transition-all hover:border-amber-600/50 hover:bg-stone-800"
                          >
                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-stone-700">
                              {product.image ? (
                                <img
                                  src={getProxiedImageUrl(product.image || '')}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Gift className="h-5 w-5 text-amber-600/40" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-amber-200 truncate">
                                {product.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-bold text-amber-400">
                                  ${product.price.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-amber-200/40">
                                  {product.category}
                                </span>
                              </div>
                            </div>
                            <ShoppingBag className="h-3.5 w-3.5 flex-shrink-0 text-amber-500/50" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading animation */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-stone-900/80 border border-amber-900/20 px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <motion.div
                        className="h-2 w-2 rounded-full bg-amber-500"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="h-2 w-2 rounded-full bg-amber-500"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="h-2 w-2 rounded-full bg-amber-500"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      />
                      <span className="ml-1 text-xs text-amber-400/60">Finding gifts...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            {messages.length <= 1 && !isLoading && (
              <div className="border-t border-amber-900/20 px-3 py-2">
                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-amber-400/50">
                  Quick suggestions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleQuickSuggestion(s.query)}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-900/30 bg-stone-900/60 px-2.5 py-1 text-[11px] text-amber-200/70 transition-all hover:border-amber-600/40 hover:bg-amber-900/20 hover:text-amber-200"
                    >
                      <span>{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-amber-900/30 bg-stone-900/50 px-3 py-2.5"
            >
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe your perfect gift..."
                disabled={isLoading}
                className="flex-1 border-amber-900/30 bg-stone-900/50 text-sm text-amber-100 placeholder:text-amber-200/30 focus:border-amber-600/50 focus:ring-amber-600/20"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !inputValue.trim()}
                className="h-9 w-9 rounded-full bg-amber-600 text-stone-950 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
