'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const mkId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Soy el asistente de Fabrick. ¿En qué puedo ayudarte hoy con tu proyecto de construcción o remodelación?',
};

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { id: mkId(), role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      const reply = data.reply ?? data.error ?? 'Ocurrió un error. Intenta nuevamente.';
      setMessages((prev) => [...prev, { id: mkId(), role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: mkId(), role: 'assistant', content: 'Error de conexión. Por favor intenta nuevamente.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Chat panel */}
      <div
        className={`fixed bottom-24 right-4 z-50 flex flex-col w-[calc(100vw-2rem)] max-w-sm rounded-[1.5rem] border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl shadow-black/60 transition-all duration-300 origin-bottom-right md:right-6 ${
          open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'
        }`}
        style={{ maxHeight: '70vh' }}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white">Asistente Fabrick</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-zinc-500 hover:text-white transition-colors p-1"
            aria-label="Cerrar chat"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[200px]" style={{ maxHeight: '50vh' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-yellow-400 text-black font-medium rounded-br-sm'
                    : 'bg-zinc-900 text-zinc-200 border border-white/5 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
                <Loader2 size={14} className="text-yellow-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/5">
          <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none leading-relaxed max-h-24"
              style={{ minHeight: '1.5rem' }}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="shrink-0 p-1.5 rounded-lg bg-yellow-400 text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-yellow-300 transition-colors"
              aria-label="Enviar mensaje"
            >
              <Send size={14} />
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-zinc-600 text-center tracking-wide">
            IA · Fabrick &mdash; Enter para enviar
          </p>
        </div>
      </div>

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full border flex items-center justify-center shadow-lg shadow-black/50 transition-all duration-300 md:right-6 ${
          open
            ? 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
            : 'bg-yellow-400 border-yellow-400 text-black hover:bg-yellow-300 hover:shadow-[0_0_24px_rgba(250,204,21,0.4)]'
        }`}
        aria-label="Abrir asistente Fabrick"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}
