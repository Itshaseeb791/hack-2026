import { Role, ChatMessage } from '../types';

const API_BASE_URL = 'http://localhost:8000';

export const chatService = {
  sendMessage: (role: Role, messages: ChatMessage[]) => {
    // Returns EventSource for SSE streaming
    const url = `${API_BASE_URL}/chat`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, messages }),
    });
  },
};
