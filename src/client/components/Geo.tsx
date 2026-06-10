import { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Loader2, Bot, ArrowUp } from 'lucide-react';
import { chatApi } from '../lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Geo() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatApi.status().then(s => setEnabled(s.enabled)).catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (open && messages.length === 0 && enabled) {
      chatApi.insight().then(r => setInsight(r.insight)).catch(() => {});
    }
  }, [open, messages.length, enabled]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  if (enabled === null) return null;
  if (enabled === false) return null; // Geo disabled - don't show button at all

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    const newMessages: Message[] = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { reply } = await chatApi.send(newMessages);
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: `Sorry, I had trouble responding. ${err.message || ''}`,
      }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const suggestedPrompts = [
    "What's my best move this month?",
    "Avalanche vs Snowball for my numbers?",
    "Where can I cut expenses?",
  ];

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-6 z-20 group"
          title={enabled ? 'Ask Geo' : 'Geo (not configured)'}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-glow-emerald">
              {enabled ? <Sparkles className="w-5 h-5" strokeWidth={2} /> : <Bot className="w-5 h-5 opacity-60" strokeWidth={2} />}
            </div>
          </div>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-20 w-[calc(100vw-3rem)] sm:w-[420px] h-[640px] max-h-[80vh] bg-white dark:bg-ink-900 border border-ink-200/70 dark:border-ink-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-ink-200/70 dark:border-ink-800 bg-gradient-to-br from-emerald-50/80 via-white to-white dark:from-emerald-500/10 dark:via-ink-900 dark:to-ink-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-30" />
                <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" strokeWidth={2.25} />
                </div>
              </div>
              <div>
                <h3 className="font-serif text-lg leading-none tracking-tight">Geo</h3>
                <p className="text-[11px] text-ink-500 mt-0.5 tracking-wide uppercase">Financial co-pilot</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800 rounded-md text-ink-500 hover:text-ink-900 dark:hover:text-ink-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div ref={scrollRef} className="geo-scroll flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {!enabled && (
              <div className="text-center py-10">
                <Bot className="w-10 h-10 mx-auto mb-3 text-ink-400 dark:text-ink-600" strokeWidth={1.5} />
                <p className="font-serif text-base text-ink-800 dark:text-ink-200">Geo is starting up</p>
                <p className="text-xs text-ink-500 mt-2 max-w-[280px] mx-auto">
                  Ollama isn't reachable yet. The model may still be downloading — check <code className="bg-ink-100 dark:bg-ink-800 px-1.5 py-0.5 rounded text-[10.5px] font-mono">docker compose logs ollama-init</code> for progress.
                </p>
              </div>
            )}

            {enabled && messages.length === 0 && (
              <>
                <div className="bg-ink-50 dark:bg-ink-800/50 rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed text-ink-700 dark:text-ink-200">
                  Hi — I'm <span className="font-serif font-medium text-emerald-700 dark:text-emerald-400">Geo</span>. I can see your income, expenses, and debts. Ask me anything, or try a starter below.
                </div>

                {insight && (
                  <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-transparent border border-emerald-500/30 rounded-2xl p-4">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-1">Insight</p>
                        <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-200">{insight}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3">
                  <p className="text-[10.5px] uppercase tracking-wider text-ink-500 font-semibold mb-2 px-1">Try asking</p>
                  <div className="space-y-1.5">
                    {suggestedPrompts.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => send(p)}
                        className="w-full text-left text-sm px-4 py-3 rounded-xl border border-ink-200 dark:border-ink-800 hover:border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-colors text-ink-700 dark:text-ink-300 flex items-center justify-between group"
                      >
                        <span>{p}</span>
                        <ArrowUp className="w-3.5 h-3.5 rotate-45 text-ink-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-2xl rounded-br-md px-4 py-2.5'
                    : 'bg-ink-50 dark:bg-ink-800/50 text-ink-800 dark:text-ink-100 rounded-2xl rounded-tl-md px-4 py-3'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-ink-50 dark:bg-ink-800/50 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          {enabled && (
            <div className="p-3 border-t border-ink-200/70 dark:border-ink-800 bg-ink-50/30 dark:bg-ink-900">
              <div className="flex gap-2 items-end bg-white dark:bg-ink-800/50 border border-ink-200 dark:border-ink-700 rounded-2xl p-1.5 focus-within:border-emerald-500/40 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  rows={1}
                  placeholder="Ask Geo anything..."
                  className="flex-1 resize-none bg-transparent border-0 px-3 py-2 text-sm text-ink-900 dark:text-ink-50 placeholder-ink-400 dark:placeholder-ink-600 focus:outline-none max-h-32"
                />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-ink-300 disabled:to-ink-400 dark:disabled:from-ink-700 dark:disabled:to-ink-800 disabled:cursor-not-allowed text-white flex items-center justify-center flex-shrink-0 transition-all shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" strokeWidth={2.25} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
