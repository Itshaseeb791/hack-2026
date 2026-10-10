import { API_BASE_URL } from './api';

interface ChatWireMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const chatService = {
  // Returns the raw streaming Response — POST /chat on the backend sends
  // Server-Sent Events, so callers read response.body themselves rather
  // than using EventSource (which can't send a POST body).
  sendMessage: (role: 'buyer' | 'org', messages: ChatWireMessage[]) => {
    return fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, messages }),
    });
  },
};
