'use client';

import { useState, useRef, useEffect } from 'react';
import { aiApi } from '@/lib/api';
import { ChatMessage } from '@/lib/types';
import { Bot, X, Send, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  courseContext?: string; // lesson content snippet for grounding
  courseTitle?: string;
}

export default function AIChatWidget({ courseContext, courseTitle }: Props) {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your AI tutor${courseTitle ? ` for **${courseTitle}**` : ''}. Ask me anything — I can explain concepts, generate quizzes, or suggest what to learn next! 🎓`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: q, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.ask({ question: q, session_id: sessionId, course_context: courseContext });
      setSessionId(res.data.session_id);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: res.data.answer, timestamp: new Date() },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I had trouble responding. Please try again.', timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    if (sessionId) await aiApi.clearSession(sessionId).catch(() => {});
    setSessionId(undefined);
    setMessages([{
      role: 'assistant',
      content: 'Session cleared! Ask me anything 😊',
      timestamp: new Date(),
    }]);
  };

  // Quick-action prompt buttons
  const quickPrompts = [
    { label: '📝 Generate quiz', prompt: `Generate a 5-question quiz on this topic: ${courseTitle || 'the current lesson'}` },
    { label: '🔍 Explain key concepts', prompt: 'Summarise the most important concepts from this lesson.' },
    { label: '➡️ What to learn next?', prompt: 'What should I learn after this to continue progressing?' },
  ];

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-white shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-semibold">AI Tutor</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[600px] rounded-2xl border bg-white shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">AI Tutor</p>
                <p className="text-xs opacity-75">Powered by Groq · llama-3.3-70b</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearChat} title="Clear chat" className="opacity-75 hover:opacity-100">
                <RefreshCw className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} className="opacity-75 hover:opacity-100">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                {m.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
                  <div className="text-sm prose prose-sm max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                  <p className="text-[10px] opacity-50 mt-1">
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="chat-bubble-assistant flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
              {quickPrompts.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => { setInput(qp.prompt); }}
                  className="text-xs rounded-full border border-primary/30 text-primary px-2.5 py-1 hover:bg-primary/5 transition-colors"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t px-3 py-2 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask a question…"
              className="flex-1 text-sm bg-muted rounded-lg px-3 py-2 outline-none focus:ring-2 ring-primary/30"
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="rounded-lg bg-primary p-2 text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
