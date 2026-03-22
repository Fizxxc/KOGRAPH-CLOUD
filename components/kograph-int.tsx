'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { createKographReply, getKographIdentity } from '../lib/kograph-chat';

type ChatMessage = { id: string; role: 'user' | 'bot'; text: string };

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

function RobotOrb({ large = false }: { large?: boolean }) {
  return (
    <div className={`relative flex items-center justify-center rounded-full ${large ? 'h-12 w-12' : 'h-10 w-10'}`}>
      <motion.div
        className="absolute inset-0 rounded-full bg-cyan-400/10 blur-xl"
        animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.85, 0.4] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border border-cyan-300/20"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />
      <div className="relative h-full w-full rounded-full border border-cyan-300/30 bg-cyan-300/10">
        <motion.div className="absolute left-[24%] top-[32%] h-2.5 w-2.5 rounded-full bg-cyan-100" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
        <motion.div className="absolute right-[24%] top-[32%] h-2.5 w-2.5 rounded-full bg-cyan-100" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.15 }} />
        <motion.div className="absolute left-1/2 top-[58%] h-1.5 w-5 -translate-x-1/2 rounded-full bg-cyan-100/80" animate={{ scaleX: [1, 0.7, 1] }} transition={{ duration: 2.8, repeat: Infinity }} />
      </div>
    </div>
  );
}

export function KographInt() {
  const identity = useMemo(() => getKographIdentity(), []);
  const [open, setOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: createId(), role: 'bot', text: 'KOGRAPH.INT aktif. Sistem aman.' }]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: createId(), role: 'user', text }]);
    setInput('');

    const reply = createKographReply(text);
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: createId(), role: 'bot', text: reply.response }]);
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 120);

    await fetch('/api/security/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: reply.suspicious ? 'warn' : 'info',
        source: 'KOGRAPH.INT',
        message: reply.suspicious ? `suspicious phrase detected: ${text}` : 'chat interaction',
        meta: { suspicious: reply.suspicious }
      })
    }).catch(() => undefined);
  };

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 hidden items-center gap-4 rounded-3xl border border-cyan-400/15 bg-slate-950/70 px-4 py-3 shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl md:flex"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <RobotOrb />
        <div>
          <div className="text-sm font-semibold text-cyan-200">{identity.name}</div>
          <div className="text-xs text-white/55">Sentinel online</div>
        </div>
      </motion.button>

      <nav className="fixed bottom-0 left-0 right-0 z-40 block border-t border-white/10 bg-slate-950/88 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 backdrop-blur-2xl md:hidden">
        <div className="mx-auto flex max-w-md items-end justify-between">
          <button type="button" onClick={() => setDockOpen((v) => !v)} className="min-w-[74px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/75">Vault</button>
          <div className="relative -mt-8 flex flex-col items-center">
            <button type="button" onClick={() => setOpen((v) => !v)} className="relative flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/20 bg-slate-950 shadow-glow">
              <div className="absolute inset-0 rounded-full border border-cyan-300/10" />
              <RobotOrb large />
            </button>
            <div className="mt-2 text-[10px] font-semibold tracking-[0.24em] text-cyan-200">KOGRAPH</div>
          </div>
          <button type="button" onClick={() => setDockOpen((v) => !v)} className="min-w-[74px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/75">Guard</button>
        </div>
        <AnimatePresence>
          {dockOpen ? (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }} className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-3">
              <div className="card-edge rounded-3xl bg-white/[0.04] px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Vault</div>
                <div className="mt-1 text-sm font-semibold">Encrypted</div>
              </div>
              <div className="card-edge rounded-3xl bg-cyan-400/10 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/60">Guard</div>
                <div className="mt-1 text-sm font-semibold text-cyan-100">Active</div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </nav>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button type="button" className="fixed inset-0 z-50 bg-black/55" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.985 }} className="fixed bottom-24 left-4 right-4 z-[60] overflow-hidden rounded-[28px] border border-cyan-400/15 bg-slate-950/92 backdrop-blur-2xl md:bottom-28 md:left-auto md:right-6 md:w-[390px]">
              <div className="border-b border-white/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 p-2"><RobotOrb /></div>
                  <div>
                    <div className="text-sm font-semibold text-cyan-200">{identity.name}</div>
                    <div className="text-xs text-white/45">Developer {identity.developer}</div>
                  </div>
                </div>
              </div>
              <div ref={scrollRef} className="max-h-[52vh] space-y-3 overflow-y-auto px-4 py-4 md:max-h-[380px]">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-cyan-400/15 text-cyan-100' : 'border border-white/10 bg-white/[0.04] text-white/90'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 p-3">
                <div className="flex items-center gap-2">
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Tulis pesan..." className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                  <button type="button" onClick={send} className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950">Kirim</button>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
