import React, { useState } from 'react';
import { useRole } from '../../context/RoleContext';
import { chatService } from '../../services/chatService';
import type { Listing } from '../../types';
import { ListingCard } from '../feed/ListingCard';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  listings?: Listing[];
}

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

export const ChatContainer: React.FC = () => {
  const { role } = useRole();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [sending, setSending] = useState(false);

  const chatRole = role === 'buyer' || role === 'org' ? role : null;

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    if (!chatRole) {
      setMessages((m) => [...m, { role: 'user', content: message }, { role: 'assistant', content: "The chat assistant only works for buyers and organizations right now — switch roles to try it." }]);
      setMessage('');
      return;
    }

    const history = [...messages, { role: 'user' as const, content: message }];
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
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong reaching the assistant.' };
        return next;
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-green-600 text-white p-3 font-semibold">
        AI Chat Assistant
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`p-3 rounded ${msg.role === 'user' ? 'bg-blue-100 ml-auto max-w-[80%]' : 'bg-gray-100 max-w-[80%]'}`}>
            <p className="whitespace-pre-wrap">{msg.content}</p>
            {msg.listings && msg.listings.length > 0 && (
              <div className="mt-2 space-y-2">
                {msg.listings.map((l) => <ListingCard key={l.id} listing={l} />)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t p-4 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about food..."
          className="flex-1 border rounded px-3 py-2"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={sending}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
};
