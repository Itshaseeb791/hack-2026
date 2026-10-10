import React, { useState, useRef, useEffect } from 'react';
import { useRole } from '../../context/RoleContext';
import { ChatMessage } from '../../types';

export const ChatContainer: React.FC = () => {
  const { role } = useRole();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const startVoice = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || isStreaming) return;
    
    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setMessage('');
    setIsStreaming(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: role,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error('Chat failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let currentListings: any[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('event: listings')) {
              const dataLine = lines[lines.indexOf(line) + 1];
              if (dataLine?.startsWith('data: ')) {
                currentListings = JSON.parse(dataLine.slice(6));
              }
            } else if (line.startsWith('event: token')) {
              const dataLine = lines[lines.indexOf(line) + 1];
              if (dataLine?.startsWith('data: ')) {
                const tokenData = JSON.parse(dataLine.slice(6));
                assistantContent += tokenData.text;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const lastIdx = newMsgs.findIndex(m => m.role === 'assistant' && m.timestamp.getTime() === Date.now());
                  if (lastIdx >= 0) {
                    newMsgs[lastIdx].content = assistantContent;
                  } else {
                    newMsgs.push({ role: 'assistant', content: assistantContent, listings: currentListings, timestamp: new Date() });
                  }
                  return newMsgs;
                });
              }
            } else if (line.startsWith('event: done')) {
              if (assistantContent) speak(assistantContent);
            }
          }
        }
      }

      setMessages(prev => {
        const filtered = prev.filter(m => !(m.role === 'assistant' && !m.content));
        const lastMsg = filtered[filtered.length - 1];
        if (lastMsg?.role === 'assistant') {
          lastMsg.listings = currentListings;
        } else if (assistantContent || currentListings.length > 0) {
          filtered.push({ role: 'assistant', content: assistantContent, listings: currentListings, timestamp: new Date() });
        }
        return filtered;
      });
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date() }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-green-600 text-white p-3 font-semibold flex justify-between items-center">
        <span>AI Chat Assistant</span>
        {('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
          <button
            onClick={startVoice}
            disabled={isListening}
            className={`px-3 py-1 rounded text-sm ${isListening ? 'bg-red-500 animate-pulse' : 'bg-white text-green-600'}`}
          >
            {isListening ? '🎤 Listening...' : '🎤 Voice'}
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg mb-2">👋 Welcome to SaveFood!</p>
            <p className="text-sm">Ask me about available food in your language (English, Urdu, or Roman Urdu)</p>
            <p className="text-xs mt-2">Try: "What food is available under Rs 200?" or "Kya free biryani hai?"</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`${msg.role === 'user' ? 'ml-auto' : ''} max-w-[85%]`}>
            <div className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white ml-auto' : 'bg-white shadow'}`}>
              {msg.content}
            </div>
            
            {msg.listings && msg.listings.length > 0 && (
              <div className="mt-2 space-y-2">
                {msg.listings.map((listing: any, idx: number) => (
                  <div key={idx} className="bg-white rounded shadow-sm p-3 border-l-4 border-green-500">
                    <div className="flex gap-3">
                      <img src={`http://localhost:8000${listing.image_url}`} alt={listing.title} className="w-20 h-20 object-cover rounded" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{listing.title}</h4>
                        <p className="text-xs text-gray-600">{listing.vendor_name}</p>
                        <p className="text-sm mt-1">
                          <span className="font-semibold">
                            {listing.sponsor_pct === 100 ? 'FREE' : `PKR ${listing.org_price || listing.current_price}`}
                          </span>
                          {' • '}{listing.qty} units
                        </p>
                        <button className="mt-2 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">
                          {role === 'buyer' ? 'Reserve' : 'Claim'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {isStreaming && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="animate-bounce">●</div>
            <div className="animate-bounce delay-100">●</div>
            <div className="animate-bounce delay-200">●</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t p-4 bg-white flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about food... (English, Urdu, Roman Urdu)"
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={isStreaming}
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !message.trim()}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStreaming ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
};
