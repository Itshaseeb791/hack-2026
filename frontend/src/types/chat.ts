import type { Listing } from './listing';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  listings?: Listing[];
  timestamp: Date;
}

export interface SSEEvent {
  type: 'listings' | 'token' | 'done';
  data?: any;
}
