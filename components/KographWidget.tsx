"use client";

import { useState } from "react";
import { createKographReply, getKographIdentity } from "../lib/kograph-chat";

export default function KographWidget() {
  const identity = getKographIdentity();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([{ role: "bot", text: `Saya ${identity.name}. Developer ${identity.developer}.` }]);

  async function send() {
    const value = text.trim();
    if (!value) return;
    const reply = createKographReply(value);
    setMessages((prev) => [...prev, { role: "user", text: value }, { role: "bot", text: reply.response }]);
    setText("");
    await fetch("/api/security/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: reply.suspicious ? "warn" : "info",
        source: identity.name,
        event: reply.suspicious ? "suspicious_chat_phrase" : "chat_message",
        message: value
      })
    });
  }

  return (
    <>
      <button className="kograph-fab" onClick={() => setOpen((v) => !v)} aria-label="Open Kograph">
        <span className="robot-mark">
          <span className="ring ring-1" />
          <span className="ring ring-2" />
          <span className="robot-face">
            <span className="eye left" />
            <span className="eye right" />
            <span className="mouth" />
          </span>
        </span>
        <span className="fab-text">
          <strong>KOGRAPH.INT</strong>
          <small>Guard online</small>
        </span>
      </button>

      <div className={`mobile-nav ${open ? "nav-shift" : ""}`}>
        <button className="nav-pill">Vault</button>
        <button className="nav-core" onClick={() => setOpen((v) => !v)} aria-label="Kograph center">
          <span className="robot-mark robot-mark-center">
            <span className="ring ring-1" />
            <span className="ring ring-2" />
            <span className="robot-face">
              <span className="eye left" />
              <span className="eye right" />
              <span className="mouth" />
            </span>
          </span>
          <span>KOGRAPH</span>
        </button>
        <button className="nav-pill">Guard</button>
      </div>

      {open && (
        <div className="chat-panel">
          <div className="chat-head">
            <div>
              <strong>{identity.name}</strong>
              <small>Secure assistant</small>
            </div>
            <button onClick={() => setOpen(false)}>Tutup</button>
          </div>
          <div className="chat-body">
            {messages.map((message, idx) => (
              <div key={idx} className={`chat-bubble ${message.role}`}>{message.text}</div>
            ))}
          </div>
          <div className="chat-input">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Tanya KOGRAPH.INT..." />
            <button onClick={send}>Kirim</button>
          </div>
        </div>
      )}
    </>
  );
}
