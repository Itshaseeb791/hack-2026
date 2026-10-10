import React, { useEffect, useRef, useState } from 'react';
import { Bot, User, Send, Sparkles } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { chatService } from '../../services/chatService';
import type { Listing } from '../../types';
import { ListingCard } from '../feed/ListingCard';
import { Button } from '../common/Button';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  listings?: Listing[];
}

const SUGGESTIONS: Record<'buyer' | 'org', string[]> = {
  buyer: ['What\'s under Rs 100?', 'Any biryani available?', 'What expires soonest?'],
  org: ['What\'s free for kids?', 'Anything from Haveli Restaurant?', 'Show everything available'],
};

// Parses one or more "event: X\ndata: Y\n\n" blocks out of a raw SSE chunk.
function parseSSEEvents(raw: string): { event: string; data: string }[] {
  return raw
    .split('\n\n')
    .filter(Boolean)
    .map((block) => {
      const eventLine = block.split('\n').find((l) => l.startsWith('event: '));
      const dataLine = block.split('\n').find((l) => l.startsWith('data: '));
      return {
        event: eventLine ? eventLine.slice('event: '.length).trim() : '',
        data: dataLine ? dataLine.slice('data: '.length) : '',
      };
    })
    .filter((e) => e.event);
}

const TypingDots: React.FC = () => (
  <span className="inline-flex items-center gap-1 py-1">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </span>
);

export const ChatContainer: React.FC = () => {
  const { role } = useRole();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatRole = role === 'buyer' || role === 'org' ? role : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendText = async (text: string) => {
    if (!text.trim() || sending) return;
    if (!chatRole) {
      setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: "The chat assistant only works for buyers and organizations right now — switch roles to try it." }]);
      setMessage('');
      return;
    }

    const history = [...messages, { role: 'user' as const, content: text }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setMessage('');
    setSending(true);

    try {
      const response = await chatService.sendMessage(
        chatRole,
        history.map((m) => ({ role: m.role, content: m.content }))
      );
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';
      let listings: Listing[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by a blank line — hold back any partial
        // trailing event until more bytes arrive.
        const lastBoundary = buffer.lastIndexOf('\n\n');
        if (lastBoundary === -1) continue;
        const completeChunk = buffer.slice(0, lastBoundary);
        buffer = buffer.slice(lastBoundary + 2);

        for (const evt of parseSSEEvents(completeChunk)) {
          if (evt.event === 'listings') {
            listings = JSON.parse(evt.data);
          } else if (evt.event === 'token') {
            assistantText += JSON.parse(evt.data).text;
          }
          setMessages((m) => {
            const next = [...m];
            next[next.length - 1] = { role: 'assistant', content: assistantText, listings };
            return next;
          });
        }
      }
    } catch (e) {
      console.error('[ChatContainer] chat stream failed', e);
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong reaching the assistant.' };
        return next;
      });
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => sendText(message);

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex items-center gap-2 bg-brand-600 text-white px-4 py-3 shrink-0">
        <Bot className="w-5 h-5" />
        <span className="font-semibold">AI Chat Assistant</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-4">
            <Sparkles className="w-8 h-8 text-brand-500" />
            <div>
              <p className="text-sm font-medium text-slate-700">Ask about available food</p>
              <p className="text-xs text-slate-500 mt-1">In English, Urdu, or Roman Urdu</p>
            </div>
            {chatRole && (
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {SUGGESTIONS[chatRole].map((s) => (
                  <button
                    key={s}
                    onClick={() => sendText(s)}
                    className="text-left text-sm px-3 py-2 rounded-lg border border-border bg-canvas hover:bg-brand-50 hover:border-brand-500 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const isStreamingEmpty = !isUser && sending && i === messages.length - 1 && !msg.content;
          return (
            <div key={i} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${isUser ? 'bg-brand-600 text-white' : 'bg-canvas text-brand-600 border border-border'}`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                <div className={`rounded-2xl px-4 py-2.5 text-sm ${isUser ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-canvas text-slate-800 rounded-tl-sm'}`}>
                  {isStreamingEmpty ? <TypingDots /> : <p className="whitespace-pre-wrap">{msg.content}</p>}
                </div>
                {msg.listings && msg.listings.length > 0 && (
                  <div className="space-y-2 w-full">
                    {msg.listings.map((l) => <ListingCard key={l.id} listing={l} />)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-3 flex gap-2 shrink-0">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about food..."
          disabled={sending}
          className="flex-1 min-h-touch-target rounded-full border border-border px-4 text-sm
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50"
        />
        <Button onClick={handleSend} isLoading={sending} className="rounded-full !px-3" aria-label="Send">
          {!sending && <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};
