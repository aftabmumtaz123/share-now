"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, ArrowLeft, Check, CheckCheck, ChevronDown, Copy, LoaderCircle,
  MessageCircle, MoreHorizontal, Paperclip, RefreshCw, Reply, Search, Send,
  Smile, Trash2, X
} from "lucide-react";

type Conversation = {
  _id: string;
  type: "direct" | "group";
  title: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
};
type Message = {
  _id: string;
  text: string;
  senderId: string;
  createdAt: string;
  updatedAt?: string;
  messageType?: string;
  editedAt?: string;
  deletedAt?: string;
  replyTo?: { _id: string; text: string; senderId?: string } | string;
  attachments?: { url: string; name: string; mimeType: string; sizeBytes?: number }[];
  reactions?: { userId: string; emoji: string }[];
  sender?: { id: string; displayName: string; username: string; avatar?: string } | null;
};
type CurrentUser = { id: string; displayName: string; username: string; avatar?: string };

function timeLabel(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

export default function ChatClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [menuFor, setMenuFor] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingText, setEditingText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async (chooseFirst = true) => {
    try {
      const r = await fetch("/api/conversations", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load conversations.");
      setConversations(d.conversations || []);
      if (chooseFirst && !selected && d.conversations?.[0]) setSelected(d.conversations[0]._id);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load conversations.");
    }
  }, [selected]);

  const loadMessages = useCallback(async (id = selected, scroll = true) => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/conversations/${id}/messages?limit=20`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load messages.");
      setMessages(d.messages || []);
      setHasOlder(Boolean(d.hasMore));
      if (scroll) requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" }));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => { if (d.user) setCurrentUser(d.user); }).catch(() => {});
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selected) {
      setMobileChatOpen(true);
      setReplyTo(null);
      setMessageSearch("");
      loadMessages(selected);
    }
  }, [selected, loadMessages]);

  useEffect(() => {
    if (messages.length && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const filteredConversations = useMemo(() => conversations.filter(c =>
    `${c.title} ${c.lastMessage || ""}`.toLowerCase().includes(search.toLowerCase())
  ), [conversations, search]);
  const filteredMessages = useMemo(() => messages.filter(m =>
    !messageSearch.trim() || (m.text || "").toLowerCase().includes(messageSearch.toLowerCase())
  ), [messages, messageSearch]);
  const activeConversation = conversations.find(c => c._id === selected);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !selected || sending) return;
    setSending(true);
    setError("");
    try {
      const r = await fetch(`/api/conversations/${selected}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), ...(replyTo ? { replyTo: replyTo._id } : {}) })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not send message.");
      setText("");
      setReplyTo(null);
      await loadMessages(selected, true);
      await loadConversations(false);
      inputRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function uploadAttachment(file: File) {
    if (!selected || uploading) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("conversationId", selected);
      const uploadResponse = await fetch("/api/uploads", { method: "POST", body: form });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadData.error || "Could not upload file.");

      const messageResponse = await fetch(`/api/conversations/${selected}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: uploadData.file._id })
      });
      const messageData = await messageResponse.json();
      if (!messageResponse.ok) throw new Error(messageData.error || "File uploaded, but could not attach it to the message.");
      await loadMessages(selected, true);
      await loadConversations(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not share this file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function loadOlder() {
    if (!selected || !messages.length || loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    const oldHeight = listRef.current?.scrollHeight || 0;
    try {
      const first = messages[0];
      const r = await fetch(`/api/conversations/${selected}/messages?limit=20&before=${encodeURIComponent(first._id)}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load older messages.");
      setMessages(prev => [...(d.messages || []), ...prev.filter(m => !(d.messages || []).some((n: Message) => n._id === m._id))]);
      setHasOlder(Boolean(d.hasMore));
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight - oldHeight;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function deleteMessage(message: Message) {
    if (!window.confirm("Delete this message?")) return;
    try {
      const r = await fetch(`/api/messages/${message._id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not delete message.");
      setMessages(prev => prev.filter(m => m._id !== message._id));
      setMenuFor("");
      await loadConversations(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete message.");
    }
  }

  async function copyMessage(message: Message) {
    try {
      await navigator.clipboard.writeText(message.text || "");
      setMenuFor("");
    } catch {
      setError("Clipboard access was blocked by your browser.");
    }
  }

  async function editMessage(message: Message) {
    if (!editingText.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const r = await fetch(`/api/messages/${message._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", text: editingText.trim() })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not edit message.");
      setMessages(prev => prev.map(m => m._id === message._id ? { ...m, text: d.message.text, editedAt: d.message.editedAt } : m));
      setEditingId(""); setEditingText(""); setMenuFor("");
      await loadConversations(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not edit message.");
    } finally { setSavingEdit(false); }
  }

  async function toggleReaction(message: Message, emoji: string) {
    try {
      const r = await fetch(`/api/messages/${message._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "react", emoji })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not update reaction.");
      setMessages(prev => prev.map(m => m._id === message._id ? { ...m, reactions: d.reactions || [] } : m));
      setMenuFor("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update reaction.");
    }
  }

  function onComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim() && !sending) e.currentTarget.form?.requestSubmit();
    }
  }

  let previousDay = "";
  return (
    <div className={`chat-layout chat-layout-modern ${mobileChatOpen ? "mobile-chat-open" : ""}`}>
      <aside className="chat-list chat-list-modern">
        <div className="chat-list-heading">
          <div><div className="chat-title">Inbox <span className="badge">{conversations.length}</span></div><p className="chat-caption">Your private conversations</p></div>
          <button className="icon-btn" title="Refresh conversations" onClick={() => loadConversations(false)}><RefreshCw size={16} /></button>
        </div>
        <div className="chat-search"><Search size={16} /><input aria-label="Search conversations" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…" /></div>
        <div className="chat-list-scroll">
          {filteredConversations.map(c => (
            <button
              type="button"
              className={`chat-person chat-person-modern ${selected === c._id ? "selected" : ""}`}
              key={c._id}
              onClick={() => {
                // On mobile, reopening the already-selected conversation must still
                // switch from the inbox pane to the chat pane.
                setMobileChatOpen(true);
                if (selected === c._id) {
                  void loadMessages(c._id);
                } else {
                  setSelected(c._id);
                }
              }}
            >
              <div className={`chat-avatar ${c.type === "group" ? "group-avatar" : ""}`}>{c.avatar ? <img src={c.avatar} alt="" className="chat-avatar-image" /> : c.title.trim().charAt(0).toUpperCase() || <MessageCircle size={17} />}</div>
              <div className="chat-person-copy"><div className="chat-person-title"><strong>{c.title}</strong><span>{timeLabel(c.lastMessageAt)}</span></div><div className="chat-person-preview">{c.lastMessage || "Start a conversation"}</div></div>
            </button>
          ))}
          {!filteredConversations.length && <div className="chat-empty-list"><div className="chat-empty-icon"><MessageCircle size={22} /></div><strong>{search ? "No matches found" : "Your inbox is quiet"}</strong><p>{search ? "Try another search term." : "Connect with someone to start a private conversation."}</p></div>}
        </div>
        <div className="chat-list-footer"><span className="online-dot" /> Private conversations</div>
      </aside>

      <section className="chat-window chat-window-modern">
        {activeConversation ? <>
          <header className="chat-header">
            <button type="button" className="icon-btn mobile-back" aria-label="Back to conversations" onClick={() => setMobileChatOpen(false)}><ArrowLeft size={18} /></button>
            <div className={`chat-avatar ${activeConversation.type === "group" ? "group-avatar" : ""}`}>{activeConversation.avatar ? <img src={activeConversation.avatar} alt="" className="chat-avatar-image" /> : activeConversation.title.trim().charAt(0).toUpperCase()}</div>
            <div className="chat-header-copy"><strong>{activeConversation.title}</strong><span>{activeConversation.type === "group" ? "Group conversation" : "Private conversation"}</span></div>
            <div className="chat-header-actions">
              <button type="button" className={`icon-btn ${showSearch ? "active" : ""}`} title="Search messages" onClick={() => setShowSearch(v => !v)}><Search size={17} /></button>
              <button type="button" className="icon-btn" title="Refresh messages" onClick={() => loadMessages(selected)}><RefreshCw size={16} /></button>
            </div>
          </header>
          {showSearch && <div className="message-search"><Search size={15} /><input autoFocus value={messageSearch} onChange={e => setMessageSearch(e.target.value)} placeholder="Find text in loaded messages…" /><span>{filteredMessages.length} results</span><button className="icon-btn" onClick={() => { setShowSearch(false); setMessageSearch(""); }} aria-label="Close search"><X size={15} /></button></div>}
          {error && <div className="chat-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error"><X size={14} /></button></div>}
          <div className="messages messages-modern" ref={listRef}>
            {hasOlder && <button className="load-older" onClick={loadOlder} disabled={loadingOlder}>{loadingOlder ? <LoaderCircle size={14} className="spin" /> : <ArrowDown size={14} />} Load older messages</button>}
            {loading && !messages.length ? <div className="chat-loading"><LoaderCircle className="spin" size={22} /><span>Loading conversation…</span></div> : filteredMessages.map(m => {
              const mine = Boolean(currentUser && String(m.senderId) === currentUser.id);
              const day = dayLabel(m.createdAt);
              const showDay = day !== previousDay;
              previousDay = day;
              const reply = typeof m.replyTo === "object" ? m.replyTo : null;
              return <div key={m._id}>
                {showDay && <div className="date-divider"><span>{day}</span></div>}
                <div className={`message-row ${mine ? "outgoing" : "incoming"}`}>
                  {!mine && <div className="message-sender-avatar" title={m.sender?.displayName || "Sender"}>{m.sender?.avatar ? <img src={m.sender.avatar} alt="" /> : (m.sender?.displayName || "?").trim().charAt(0).toUpperCase()}</div>}
                  <div className={`message-content ${mine ? "mine-content" : "incoming-content"}`}>
                    {!mine && activeConversation.type === "group" && <div className="message-sender-name">{m.sender?.displayName || m.sender?.username || "Group member"}</div>}
                    <div className={`bubble bubble-modern ${mine ? "mine" : ""}`}>
                    {reply && <div className={`reply-quote ${mine ? "reply-quote-mine" : ""}`}><span>Replying to message</span><p>{reply.text || "Message unavailable"}</p></div>}
                    {editingId === m._id ? <div className="message-edit-form"><textarea aria-label="Edit message" value={editingText} onChange={e => setEditingText(e.target.value)} autoFocus maxLength={5000} /><div><button type="button" onClick={() => { setEditingId(""); setEditingText(""); }}>Cancel</button><button type="button" className="save-edit" disabled={!editingText.trim() || savingEdit} onClick={() => void editMessage(m)}>{savingEdit ? "Saving…" : "Save"}</button></div></div> : <div className="bubble-text">{m.text}</div>}
                    {m.attachments?.map((attachment, index) => <div className="chat-attachment" key={`${m._id}-${index}`}>
                      {attachment.mimeType?.startsWith("image/") ? <a href={attachment.url} target="_blank" rel="noreferrer"><img src={attachment.url} alt={attachment.name} className="chat-attachment-image" /></a> : null}
                      <a href={attachment.url} target="_blank" rel="noreferrer" download={attachment.name} className="chat-attachment-link"><Paperclip size={14} /><span>{attachment.name}</span></a>
                    </div>)}
                    {Boolean(m.reactions?.length) && <div className="reaction-list">{Array.from(new Set(m.reactions?.map(r => r.emoji) || [])).map(emoji => { const count = m.reactions?.filter(r => r.emoji === emoji).length || 0; const reacted = Boolean(m.reactions?.some(r => r.emoji === emoji && r.userId === currentUser?.id)); return <button type="button" key={emoji} className={`reaction-chip ${reacted ? "reacted" : ""}`} onClick={() => void toggleReaction(m, emoji)} aria-label={`React ${emoji}`}>{emoji} <span>{count}</span></button>; })}</div>}
                    <div className="bubble-meta"><span>{timeLabel(m.createdAt)}</span>{m.editedAt && <span>· edited</span>}{mine && <CheckCheck size={13} aria-label="Saved" />}</div>
                    <div className="message-actions">
                      <button className="message-action-btn" title="Reply" onClick={() => { setReplyTo(m); inputRef.current?.focus(); }}><Reply size={14} /></button>
                      <button className="message-action-btn" title="Copy message" onClick={() => copyMessage(m)}><Copy size={14} /></button>
                      {mine && <button className="message-action-btn" title="Edit message" onClick={() => { setEditingId(m._id); setEditingText(m.text); setMenuFor(""); }}><span className="edit-glyph">✎</span></button>}
                      {mine && <button className="message-action-btn" title="Delete message" onClick={() => deleteMessage(m)}><Trash2 size={14} /></button>}
                    </div>
                    <button className="message-more" aria-label="Message actions" onClick={() => setMenuFor(menuFor === m._id ? "" : m._id)}><MoreHorizontal size={15} /></button>
                    {menuFor === m._id && <div className="message-menu"><button onClick={() => { setReplyTo(m); setMenuFor(""); inputRef.current?.focus(); }}><Reply size={14} /> Reply</button><button onClick={() => copyMessage(m)}><Copy size={14} /> Copy text</button>{mine && <button onClick={() => { setEditingId(m._id); setEditingText(m.text); setMenuFor(""); }}><span className="edit-glyph">✎</span> Edit message</button>}<div className="message-menu-reactions">{["👍", "❤️", "😂", "😮", "😢", "🎉"].map(emoji => <button type="button" key={emoji} title={`React ${emoji}`} onClick={() => void toggleReaction(m, emoji)}>{emoji}</button>)}</div>{mine && <button className="danger-action" onClick={() => deleteMessage(m)}><Trash2 size={14} /> Delete</button>}</div>}
                    </div>
                  </div>
                </div>
              </div>;
            })}
            {!loading && !filteredMessages.length && <div className="chat-empty-history"><div className="chat-empty-icon"><MessageCircle size={24} /></div><strong>{messageSearch ? "No messages match" : "Start the conversation"}</strong><p>{messageSearch ? "Try a different phrase." : "Send a message below to get things moving."}</p></div>}
            <div ref={bottomRef} />
          </div>
          <form className="composer composer-modern" onSubmit={send}>
            {replyTo && <div className="reply-composer"><div><span>Replying to message</span><strong>{replyTo.text || "Attachment"}</strong></div><button type="button" className="icon-btn" aria-label="Cancel reply" onClick={() => setReplyTo(null)}><X size={15} /></button></div>}
            <div className="composer-row">
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/wav,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={e => { const file = e.currentTarget.files?.[0]; if (file) void uploadAttachment(file); }}
              />
              <button type="button" className="composer-tool" title="Share a file" aria-label="Share a file" disabled={!selected || uploading} onClick={() => fileInputRef.current?.click()}>{uploading ? <LoaderCircle className="spin" size={18} /> : <Paperclip size={18} />}</button>
              <textarea ref={inputRef} className="message-input" value={text} onChange={e => setText(e.target.value)} onKeyDown={onComposerKeyDown} placeholder="Write a message…" rows={1} disabled={!selected} aria-label="Message text" />
              <span className="composer-hint">{uploading ? "Uploading file…" : "Enter to send · Shift+Enter for a new line"}</span>
              <button className="send-button" disabled={!selected || !text.trim() || sending} aria-label="Send message">{sending ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}</button>
            </div>
          </form>
        </> : <div className="chat-welcome"><div className="welcome-art"><MessageCircle size={34} /></div><h2>Your conversations, in one place.</h2><p>Choose a conversation on the left to catch up or send a message.</p><div className="welcome-tip"><Check size={15} /> Private conversations stay organized here</div></div>}
      </section>
    </div>
  );
}
