import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Send, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';

const STARTER = {
  role: 'assistant',
  content: 'Ask me about an ingredient, claim, or food choice.',
  disclaimer: 'This is a quick estimate based on our conversation, not a full label scan. For a detailed, regulation-checked analysis, use the Scan feature.',
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.35, 1, 0.35], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.14, ease: 'easeInOut' }}
          className="h-1.5 w-1.5 rounded-full bg-primary"
        />
      ))}
    </div>
  );
}

function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-4 py-2.5 font-body-md text-[14px] leading-relaxed shadow-lg [&_strong]:font-bold [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 ${
            isUser
              ? 'bg-primary text-on-primary-fixed rounded-br-md'
              : message.error
                ? 'bg-error/10 border border-error/30 text-error rounded-bl-md'
                : 'bg-surface-container-high border border-white/10 text-on-background rounded-bl-md [&_strong]:text-primary'
          }`}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        {!isUser && message.disclaimer && (
          <p className="max-w-xs px-1 font-body-md text-[11px] leading-snug text-on-surface-variant/70">
            {message.disclaimer}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([STARTER]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending, open]);

  async function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const conversationHistory = messages
        .slice(1)
        .filter((message) => !message.error)
        .map(({ role, content }) => ({ role, content }));

      const res = await chatAPI.send({
        userId: user?.userId,
        message: text,
        conversationHistory,
      });

      if (res.data?.success) {
        setMessages((current) => [
          ...current,
          { role: 'assistant', content: res.data.reply, disclaimer: res.data.disclaimer },
        ]);
      } else {
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: res.data?.message || 'I could not answer that right now.',
            disclaimer: res.data?.disclaimer,
            error: true,
          },
        ]);
      }
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: err?.response?.data?.message || 'Chat is unavailable right now.',
          disclaimer: err?.response?.data?.disclaimer || STARTER.disclaimer,
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-24 right-5 z-[65] flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary text-on-primary-fixed shadow-[0_0_24px_rgba(78,222,163,0.35)] md:bottom-8 md:right-8"
        aria-label="Open health chat"
      >
        <MessageCircle size={24} strokeWidth={2.4} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-end justify-center bg-background/70 px-3 pb-3 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none md:justify-end md:pr-8 md:pb-[90px]"
            onClick={() => setOpen(false)}
          >
            <motion.section
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel flex h-[78dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-2xl md:h-[600px] md:w-[400px] border border-white/10"
            >
              <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <MessageCircle size={19} />
                  </div>
                  <div>
                    <h2 className="font-headline-md text-[17px] text-on-background">DeCode.it Quickie</h2>
                    <p className="font-label-caps text-[10px] text-on-surface-variant">Quick health estimate</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-on-background"
                  aria-label="Close chat"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                <AnimatePresence initial={false}>
                  {messages.map((message, index) => (
                    <ChatMessage key={`${message.role}-${index}-${message.content.slice(0, 12)}`} message={message} />
                  ))}
                </AnimatePresence>
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md border border-white/10 bg-surface-container-high">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>

              <form onSubmit={handleSubmit} className="border-t border-white/10 p-3">
                <div className="flex items-end gap-2 rounded-2xl bg-background/80 p-2 ring-1 ring-white/10 focus-within:ring-primary/50">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e);
                    }}
                    rows={1}
                    placeholder="Ask about a food or ingredient"
                    className="max-h-24 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 font-body-md text-[14px] text-on-background outline-none placeholder:text-on-surface-variant/60"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || sending}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary-fixed transition-opacity disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}