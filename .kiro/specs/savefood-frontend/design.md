# Technical Design Document: SaveFood Frontend

## Overview

The SaveFood frontend is a React + Vite web application that connects food donors, vendors, buyers, and charitable organizations to reduce food waste. The application features a split-screen layout with dual interaction modes: traditional text chat and browser-based voice input powered by the Web Speech API. The frontend integrates with a FastAPI backend via REST APIs and Server-Sent Events (SSE) for streaming AI chatbot responses powered by DeepSeek.

## Architecture

### Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **State Management**: React Context API + useReducer for global state, React Query for server state
- **Routing**: React Router v6 for SPA navigation
- **Styling**: Tailwind CSS for utility-first responsive design
- **API Client**: Axios for HTTP requests, EventSource for SSE
- **Speech**: Web Speech API (SpeechRecognition and SpeechSynthesis)
- **Form Handling**: React Hook Form with Zod validation
- **Date/Time**: date-fns-tz for timezone handling (Asia/Karachi)
- **Testing**: Vitest + React Testing Library for unit tests, fast-check for property-based tests

### Component Architecture

The application follows a feature-based component architecture with shared UI components:

```
src/
├── components/
│   ├── shared/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorMessage.tsx
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── SplitScreenLayout.tsx
│   │   └── Header.tsx
│   ├── role/
│   │   └── RoleSelector.tsx
│   ├── feed/
│   │   ├── FeedContainer.tsx
│   │   ├── ListingCard.tsx
│   │   ├── PublicFeed.tsx
│   │   ├── OrgsFeed.tsx
│   │   └── FeedRefreshIndicator.tsx
│   ├── listing/
│   │   ├── VendorListingForm.tsx
│   │   ├── DonorSponsoredForm.tsx
│   │   ├── DonorDonationForm.tsx
│   │   ├── SponsorExistingModal.tsx
│   │   ├── ReservationModal.tsx
│   │   ├── PickupCodeDisplay.tsx
│   │   └── ImageUpload.tsx
│   ├── vendor/
│   │   ├── VendorDashboard.tsx
│   │   └── PickupCodeEntry.tsx
│   ├── donor/
│   │   ├── DonorDashboard.tsx
│   │   └── ImpactView.tsx
│   ├── organization/
│   │   ├── OrganizationRegistry.tsx
│   │   └── OrganizationList.tsx
│   ├── chat/
│   │   ├── ChatContainer.tsx
│   │   ├── ChatMessageList.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   ├── VoiceButton.tsx
│   │   ├── ListingCardInChat.tsx
│   │   └── SSEHandler.tsx
│   └── time/
│       ├── ExpiryTimer.tsx
│       └── TimeDisplay.tsx
├── hooks/
│   ├── useRole.ts
│   ├── useListings.ts
│   ├── useChat.ts
│   ├── useVoice.ts
│   ├── useSSE.ts
│   ├── usePolling.ts
│   └── useClipboard.ts
├── context/
│   ├── RoleContext.tsx
│   └── ChatContext.tsx
├── services/
│   ├── api.ts
│   ├── listingService.ts
│   ├── chatService.ts
│   ├── organizationService.ts
│   └── donorService.ts
├── utils/
│   ├── validation.ts
│   ├── formatting.ts
│   ├── timezone.ts
│   └── imageOptimization.ts
├── types/
│   ├── listing.ts
│   ├── role.ts
│   ├── chat.ts
│   └── organization.ts
└── App.tsx
```

## Core Components

### 1. App Layout & Routing

**AppLayout Component**
- Manages the overall application structure
- Renders role-specific dashboards based on session state
- Provides navigation and header

**SplitScreenLayout Component**
- Implements the dual-pane layout for chat + content view
- Left pane: Chat interface with AI chatbot
- Right pane: Role-specific content (feeds, forms, dashboards)
- Responsive: stacks vertically on mobile, side-by-side on desktop

### 2. Role Management

**RoleContext**
```typescript
interface RoleState {
  role: 'buyer' | 'org' | 'vendor' | 'donor' | null;
  setRole: (role: RoleState['role']) => void;
}
```

**RoleSelector Component**
- Displays four role options as interactive cards
- Stores selected role in React Context and sessionStorage
- Triggers navigation to appropriate dashboard

**useRole Hook**
```typescript
const useRole = () => {
  const context = useContext(RoleContext);
  
  useEffect(() => {
    // Persist role to sessionStorage
    if (context.role) {
      sessionStorage.setItem('savefood_role', context.role);
    }
  }, [context.role]);
  
  return context;
};
```

### 3. Feed System

**FeedContainer Component**
- Abstract container for both PublicFeed and OrgsFeed
- Handles polling via usePolling hook (60-second intervals)
- Manages loading and error states
- Implements manual refresh functionality

**usePolling Hook**
```typescript
const usePolling = (fetchFn: () => Promise<any>, interval: number) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  useEffect(() => {
    const poll = async () => {
      const result = await fetchFn();
      setData(result);
      setLastUpdated(new Date());
      setLoading(false);
    };
    
    poll(); // Initial fetch
    const intervalId = setInterval(poll, interval);
    
    return () => clearInterval(intervalId);
  }, [fetchFn, interval]);
  
  return { data, loading, lastUpdated, refresh: () => fetchFn() };
};
```

**ListingCard Component**
- Reusable card for displaying listing information
- Props: listing data, role, onReserve/onClaim callbacks
- Renders different action buttons based on role
- Displays expiry warnings using ExpiryTimer component
- Lazy-loads images using Intersection Observer API

**PublicFeed Component**
- Fetches listings with `?role=buyer`
- Filters out listings with `quantity === 0`
- Displays "Sponsor" button when role is 'donor'

**OrgsFeed Component**
- Fetches listings with `?role=org`
- Displays donor names for sponsored/donated listings
- Shows "Free" for 100% sponsored items
- Highlights urgency for items expiring within 2 hours

### 4. Listing Creation Forms

**Form Validation with Zod**
```typescript
const vendorListingSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required'),
  title: z.string().min(1, 'Title is required'),
  qty: z.number().int().positive(),
  original_price: z.number().positive(),
  current_price: z.number().positive(),
  pickup_location: z.string().min(1),
  expiry_time: z.date().refine(date => date > new Date(), {
    message: 'Expiry time must be in the future'
  }),
  photo: z.instanceof(File)
    .refine(file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), {
      message: 'Photo must be jpg, png, or webp'
    })
    .refine(file => file.size <= 5 * 1024 * 1024, {
      message: 'Photo must be under 5 MB'
    })
}).refine(data => data.current_price <= data.original_price, {
  message: 'Current price must be less than or equal to original price',
  path: ['current_price']
});
```

**VendorListingForm Component**
- Uses React Hook Form with vendorListingSchema
- Submits multipart/form-data to `POST /listings` with `source=restaurant`
- Includes ImageUpload component for photo handling
- Displays confirmation modal on success

**DonorSponsoredForm Component**
- Schema includes sponsor_pct (1-100 range validation)
- Calculates org_price dynamically: `original_price × (100 - sponsor_pct) / 100`
- Shows "Organizations will receive this for free" when sponsor_pct === 100
- Submits with `source=sponsored`

**DonorDonationForm Component**
- Schema validates prepared_at (past but within 24 hours)
- Schema validates expiry_time > prepared_at
- Submits with `source=donated`, `sponsor_pct=100`, `org_price=0`

**ImageUpload Component**
- Handles file input with drag-and-drop
- Client-side image optimization using Canvas API
- Preview before upload
- Validation feedback for format and size

### 5. Reservation & Claiming

**ReservationModal Component**
- Quantity selector with validation (max = available quantity)
- Name input field
- Submits `POST /listings/{id}/reserve`
- Displays PickupCodeDisplay on success

**PickupCodeDisplay Component**
- Shows 6-character pickup code in large, readable font
- Copy-to-clipboard button using useClipboard hook
- Displays vendor name, pickup location, expiry time
- Shows amount owed (for orgs with partial sponsorship)
- Print/Save options

**useClipboard Hook**
```typescript
const useClipboard = () => {
  const [copied, setCopied] = useState(false);
  
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return { copied, copy };
};
```

### 6. Sponsor Existing Listing

**SponsorExistingModal Component**
- Triggered from PublicFeed when role is 'donor'
- Form fields: donor_name, units (validated ≤ available), sponsor_pct (1-100)
- Calculates total cost: `units × original_price × sponsor_pct / 100`
- Displays cost in PKR format
- Submits `POST /listings/{id}/sponsor`

### 7. Vendor Pickup Confirmation

**VendorDashboard Component**
- Displays list of vendor's active listings
- Shows pickup codes for reserved items
- Includes PickupCodeEntry component

**PickupCodeEntry Component**
- Input field with 6-character validation
- Submits `POST /listings/{id}/pickup`
- Displays success/error messages

### 8. Donor Impact View

**ImpactView Component**
- Input field for donor name
- Fetches `GET /donors/{name}/impact`
- Displays summary metrics:
  - Total food units collected
  - Total PKR value contributed
  - Number of organizations served
- Breakdown table: vendor name, food item, organization that claimed, quantity

### 9. Organization Management

**OrganizationRegistry Component**
- Form with fields: name, type (dropdown: shelter/orphanage), area, daily_need, dietary_notes
- Submits `POST /organizations`
- Displays OrganizationList on success

**OrganizationList Component**
- Fetches `GET /organizations`
- Groups by type (shelter vs orphanage)
- Displays cards with name, area, daily need

### 10. Chat Interface

**ChatContainer Component**
- Manages chat state with useChat hook
- Renders ChatMessageList and ChatInput
- Handles SSE connection lifecycle

**useChat Hook**
```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
  listings?: Listing[];
  timestamp: Date;
}

const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const { role } = useRole();
  
  const sendMessage = async (content: string) => {
    const userMessage: Message = { role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    
    // SSE handling in useSSE hook
  };
  
  return { messages, sendMessage, isStreaming };
};
```

**SSEHandler / useSSE Hook**
```typescript
const useSSE = (url: string, onMessage: (event: SSEEvent) => void) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  
  const connect = () => {
    const eventSource = new EventSource(url);
    
    eventSource.addEventListener('message', (e) => {
      const data = JSON.parse(e.data);
      onMessage(data);
    });
    
    eventSource.addEventListener('error', (e) => {
      console.error('SSE error:', e);
      eventSource.close();
      // Display retry option
    });
    
    eventSourceRef.current = eventSource;
  };
  
  const disconnect = () => {
    eventSourceRef.current?.close();
  };
  
  return { connect, disconnect };
};
```

**ChatMessage Component**
- Renders user/assistant messages
- For assistant messages with listings: renders ListingCardInChat components before text
- Supports markdown formatting
- Displays timestamp

**ListingCardInChat Component**
- Simplified ListingCard for chat context
- Shows Reserve/Claim button based on role
- Opens ReservationModal on click

**ChatInput Component**
- Text input with send button
- Integrates VoiceButton
- Submit on Enter key

### 11. Voice Interface

**VoiceButton Component**
- Microphone icon that toggles voice recognition
- Visual indicator when listening (pulsing animation)
- Hidden if Web Speech API not supported
- Displays browser recommendation message when unsupported

**useVoice Hook**
```typescript
const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition && !!window.speechSynthesis);
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US'; // Configurable: en-US or ur-PK
      recognitionRef.current = recognition;
    }
  }, []);
  
  const startListening = (onResult: (transcript: string) => void) => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setIsListening(false);
    };
    
    recognitionRef.current.start();
    setIsListening(true);
  };
  
  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Match recognition language
    window.speechSynthesis.speak(utterance);
  };
  
  return { isListening, isSupported, startListening, speak };
};
```

**Voice Flow**
1. User clicks VoiceButton → requests microphone permission
2. Permission granted → SpeechRecognition starts with language setting
3. User speaks → transcript appears in ChatInput field
4. Message auto-sends to `POST /chat`
5. SSE response tokens → useVoice.speak() synthesizes speech

### 12. Time Display & Expiry Warnings

**ExpiryTimer Component**
```typescript
const ExpiryTimer: React.FC<{ expiryTime: Date }> = ({ expiryTime }) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'warning' | 'critical'>('normal');
  
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = expiryTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeRemaining(`Expires in ${hours}h ${minutes}m`);
      
      if (diff < 30 * 60 * 1000) {
        setUrgencyLevel('critical'); // <30 min: pulsing animation
      } else if (diff < 2 * 60 * 60 * 1000) {
        setUrgencyLevel('warning'); // <2 hours: red color
      } else {
        setUrgencyLevel('normal');
      }
    };
    
    updateTimer();
    const intervalId = setInterval(updateTimer, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, [expiryTime]);
  
  return (
    <div className={`expiry-timer ${urgencyLevel}`}>
      <span>{timeRemaining}</span>
      <span>{format(expiryTime, 'HH:mm', { timeZone: 'Asia/Karachi' })}</span>
    </div>
  );
};
```

**TimeDisplay Component**
- Utility component for displaying any time in Asia/Karachi timezone
- Uses date-fns-tz for timezone conversion

### 13. Error Handling

**ErrorBoundary Component**
- React error boundary for catching component errors
- Displays user-friendly error page with refresh option

**API Error Handling**
```typescript
// In api.ts service
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.detail || 'An error occurred';
      return Promise.reject({ type: 'api', message });
    } else if (error.request) {
      // Network error
      return Promise.reject({ type: 'network', message: 'Connection failed. Please check your internet.' });
    } else {
      return Promise.reject({ type: 'unknown', message: error.message });
    }
  }
);
```

**ErrorMessage Component**
- Displays contextual error messages
- Different styles for validation errors vs system errors
- Retry buttons where appropriate

**Request Timeout**
```typescript
// In api.ts
const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 30000, // 30 seconds
});
```

### 14. Responsive Design

**Tailwind Configuration**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      screens: {
        'mobile': '640px',
        'tablet': '768px',
        'desktop': '1024px',
      },
      fontSize: {
        'mobile-min': '14px',
      },
      spacing: {
        'touch-target': '44px',
      },
    },
  },
};
```

**Responsive Patterns**
- Mobile: Single-column layout, stacked chat and content
- Tablet: Side-by-side layout with smaller panes
- Desktop: Full split-screen layout

**Touch Targets**
- All buttons, inputs, and interactive elements use minimum 44×44px
- Implemented via Tailwind utility classes

**Image Handling**
- Listing images: aspect-ratio CSS for preservation
- Lazy loading: Intersection Observer API
- Responsive images: srcset for different viewport sizes

### 15. Performance Optimizations

**Code Splitting**
```typescript
// In App.tsx
const PublicFeed = lazy(() => import('./components/feed/PublicFeed'));
const OrgsFeed = lazy(() => import('./components/feed/OrgsFeed'));
const VendorDashboard = lazy(() => import('./components/vendor/VendorDashboard'));
const DonorDashboard = lazy(() => import('./components/donor/DonorDashboard'));
```

**Image Optimization**
- Client-side resize before upload (Canvas API)
- Lazy loading with Intersection Observer
- WebP format preferred, fallback to JPEG

**Caching Strategy**
```typescript
// In vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'form-vendor': ['react-hook-form', 'zod'],
        },
      },
    },
  },
});
```

**React Query Configuration**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      cacheTime: 300000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

## Data Flow

### Listing Reservation Flow
1. User views ListingCard in PublicFeed/OrgsFeed
2. User clicks Reserve/Claim button
3. ReservationModal opens with quantity selector
4. User enters name and quantity
5. Frontend validates quantity ≤ available
6. POST request to `/listings/{id}/reserve` with buyer/org name and quantity
7. Backend returns pickup code
8. PickupCodeDisplay component renders with code and instructions
9. Feed refreshes to show updated quantity

### Chat with Listings Flow
1. User types or speaks message in ChatInput
2. Message sent to `POST /chat` with role and message history
3. Backend establishes SSE connection
4. Backend sends listing events first (type: 'listings')
5. ChatMessage component renders ListingCardInChat components
6. Backend streams text tokens (type: 'token')
7. ChatMessage component appends tokens in real-time
8. Backend sends done event (type: 'done')
9. If voice mode: useVoice.speak() synthesizes response
10. Chat scrolls to bottom

### Sponsor Existing Listing Flow
1. Donor views PublicFeed
2. Donor clicks Sponsor button on ListingCard
3. SponsorExistingModal opens
4. Donor enters name, units, sponsor_pct
5. Frontend calculates total cost and displays
6. POST request to `/listings/{id}/sponsor`
7. Backend moves units to orgs feed
8. Frontend shows confirmation
9. PublicFeed refreshes to show reduced quantity

## API Integration

### Service Layer
```typescript
// listingService.ts
export const listingService = {
  getListings: (role: Role) => 
    apiClient.get<Listing[]>('/listings', { params: { role } }),
  
  createListing: (data: FormData) => 
    apiClient.post('/listings', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  reserveListing: (id: string, data: ReservationRequest) => 
    apiClient.post(`/listings/${id}/reserve`, data),
  
  sponsorListing: (id: string, data: SponsorRequest) => 
    apiClient.post(`/listings/${id}/sponsor`, data),
  
  confirmPickup: (id: string, code: string) => 
    apiClient.post(`/listings/${id}/pickup`, { pickup_code: code }),
};

// chatService.ts
export const chatService = {
  sendMessage: (role: Role, messages: ChatMessage[]) => {
    // Returns EventSource for SSE
    const url = new URL('http://localhost:8000/chat');
    url.searchParams.set('role', role);
    
    // POST message history, receive SSE URL
    return apiClient.post<{ stream_url: string }>('/chat', { messages })
      .then(res => new EventSource(res.data.stream_url));
  },
};

// donorService.ts
export const donorService = {
  getImpact: (name: string) => 
    apiClient.get<ImpactData>(`/donors/${encodeURIComponent(name)}/impact`),
};

// organizationService.ts
export const organizationService = {
  getOrganizations: () => 
    apiClient.get<Organization[]>('/organizations'),
  
  registerOrganization: (data: OrganizationRequest) => 
    apiClient.post('/organizations', data),
};
```

## State Management

### Global State (React Context)
- **RoleContext**: Current user role, persisted to sessionStorage
- **ChatContext**: Chat message history, streaming state

### Server State (React Query)
- Listings (public and orgs feeds)
- Organizations list
- Donor impact data
- Cached with 1-minute stale time, refetched on interval

### Local Component State
- Form inputs (React Hook Form)
- Modal open/closed states
- Loading indicators
- Error messages
- Voice recognition active state

## Type Definitions

```typescript
// types/listing.ts
export type Role = 'buyer' | 'org' | 'vendor' | 'donor';

export type ListingSource = 'restaurant' | 'sponsored' | 'donated';

export interface Listing {
  id: string;
  source: ListingSource;
  vendor_name: string;
  donor_name?: string;
  title: string;
  qty: number;
  original_price: number;
  current_price?: number; // For restaurant listings
  org_price?: number; // For sponsored/donated listings
  sponsor_pct?: number;
  pickup_location: string;
  expiry_time: string; // ISO 8601
  prepared_at?: string; // ISO 8601, for donated
  dietary_notes?: string;
  photo_url: string;
  audience: 'public' | 'orgs_only';
  created_at: string;
}

export interface ReservationRequest {
  name: string;
  qty: number;
}

export interface ReservationResponse {
  pickup_code: string;
  listing: Listing;
}

export interface SponsorRequest {
  donor_name: string;
  units: number;
  sponsor_pct: number;
}

// types/chat.ts
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

// types/organization.ts
export interface Organization {
  id: string;
  name: string;
  type: 'shelter' | 'orphanage';
  area: string;
  daily_need: number;
  dietary_notes?: string;
}

// types/donor.ts
export interface ImpactData {
  total_units_collected: number;
  total_value_pkr: number;
  organizations_served: number;
  breakdown: {
    vendor_name: string;
    title: string;
    organization: string;
    qty: number;
  }[];
}
```

## Validation Utilities

```typescript
// utils/validation.ts
export const validatePhotoFile = (file: File): string | null => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return 'Photo must be jpg, png, or webp';
  }
  
  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSize) {
    return 'Photo must be under 5 MB';
  }
  
  return null;
};

export const validatePickupCode = (code: string): boolean => {
  return /^[A-Za-z0-9]{6}$/.test(code);
};

export const validateFutureTime = (time: Date): boolean => {
  return time > new Date();
};

export const validatePreparedAt = (time: Date): boolean => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return time <= now && time >= twentyFourHoursAgo;
};
```

## Formatting Utilities

```typescript
// utils/formatting.ts
export const formatPKR = (amount: number): string => {
  return `PKR ${amount.toLocaleString('en-PK')}`;
};

export const formatQuantity = (qty: number): string => {
  return `${qty} unit${qty !== 1 ? 's' : ''}`;
};

export const calculateOrgPrice = (originalPrice: number, sponsorPct: number): number => {
  return originalPrice * (100 - sponsorPct) / 100;
};

export const calculateSponsorCost = (
  units: number,
  originalPrice: number,
  sponsorPct: number
): number => {
  return units * originalPrice * sponsorPct / 100;
};
```

## Timezone Utilities

```typescript
// utils/timezone.ts
import { format, formatDistanceToNow } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

const KARACHI_TZ = 'Asia/Karachi';

export const formatKarachiTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = utcToZonedTime(dateObj, KARACHI_TZ);
  return format(zonedDate, 'HH:mm');
};

export const formatTimeRemaining = (expiryTime: Date | string): string => {
  const dateObj = typeof expiryTime === 'string' ? new Date(expiryTime) : expiryTime;
  return formatDistanceToNow(dateObj, { addSuffix: true });
};

export const getUrgencyLevel = (expiryTime: Date | string): 'normal' | 'warning' | 'critical' => {
  const dateObj = typeof expiryTime === 'string' ? new Date(expiryTime) : expiryTime;
  const diff = dateObj.getTime() - new Date().getTime();
  
  if (diff < 30 * 60 * 1000) return 'critical'; // <30 minutes
  if (diff < 2 * 60 * 60 * 1000) return 'warning'; // <2 hours
  return 'normal';
};
```

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)
- Component rendering with various props
- Form validation logic
- Utility functions (formatting, timezone, validation)
- Custom hooks (useRole, useClipboard, useVoice)
- API service functions (mocked responses)

### Property-Based Tests (fast-check)
- See Correctness Properties section below
- Validation functions with random inputs
- Calculation functions with random values
- UI rendering with random data

### Integration Tests
- Full user flows (reservation, sponsorship, chat)
- SSE connection and event handling
- Voice recognition and synthesis
- Feed polling and updates

### Browser Compatibility Testing
- Manual testing on Chrome, Firefox, Safari, Edge
- Voice features specifically tested on Chrome and Edge

## Accessibility

- Semantic HTML elements (header, nav, main, article, button)
- ARIA labels for screen readers
- Keyboard navigation support (Tab, Enter, Escape)
- Focus management for modals
- Minimum 44×44px touch targets
- Minimum 14px font size on mobile
- Color contrast ratios meeting WCAG AA standards

## Security Considerations

- No authentication required (as per requirements)
- Input validation on all forms
- File upload validation (type, size)
- XSS prevention via React's auto-escaping
- HTTPS recommended for production
- CORS configuration for API requests

## Deployment

### Build Configuration
```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Environment Variables
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_POLLING_INTERVAL=60000
VITE_REQUEST_TIMEOUT=30000
```

### Production Optimizations
- Minification via Vite
- Tree shaking for unused code
- Code splitting for route-based lazy loading
- Brotli/gzip compression
- Cache headers for static assets
- CDN for image hosting

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Role Persistence

*For any* role selection, storing the role in session state should result in the role being retrievable from session state

**Validates: Requirements 1.2**

### Property 2: API Request Role Inclusion

*For any* API request made by the frontend, the request should include the currently selected role as a parameter or header

**Validates: Requirements 1.7**

### Property 3: Listing Field Completeness

*For any* listing rendered in the public feed, all required fields (title, vendor name, quantity, current price, pickup location, expiry time, image) must appear in the rendered output

**Validates: Requirements 2.2**

### Property 4: Image URL Path Correctness

*For any* listing with a photo filename, the rendered image URL should use the `/uploads/{filename}` path format

**Validates: Requirements 2.3**

### Property 5: Timezone Conversion

*For any* timestamp displayed to the user, the time should be converted to Asia/Karachi timezone

**Validates: Requirements 2.4, 19.1**

### Property 6: Zero Quantity Filtering

*For any* set of listings containing items with quantity=0, the filtered feed should exclude all zero-quantity items

**Validates: Requirements 2.5, 18.4**

### Property 7: PKR Currency Formatting

*For any* numeric price value, the displayed string should include "PKR" and use appropriate number formatting

**Validates: Requirements 2.7**

### Property 8: Organization Listing Field Completeness

*For any* listing rendered in the organizations feed, all required fields (title, vendor name, donor name if applicable, quantity, organization price, pickup location, expiry time, image) must appear in the rendered output

**Validates: Requirements 3.2**

### Property 9: Full Sponsorship Display

*For any* listing with sponsor_pct=100, the price display should show "Free" or equivalent "No payment required" messaging

**Validates: Requirements 3.3, 5.6**

### Property 10: Donated Listing Prepared Time Display

*For any* listing with source=donated, the prepared_at timestamp must appear in the rendered output

**Validates: Requirements 3.4**

### Property 11: Expiry Urgency Styling

*For any* listing with expiry time less than 2 hours from now, urgency styling (red color or animation) should be applied

**Validates: Requirements 3.5, 19.3, 19.4**

### Property 12: Reservation Button Presence

*For any* listing displayed to a buyer, a reservation button with quantity selector must be present in the rendered output

**Validates: Requirements 4.1**

### Property 13: Reservation API Call Correctness

*For any* reservation attempt, the POST request should target `/listings/{id}/reserve` with buyer name and quantity in the payload

**Validates: Requirements 4.2**

### Property 14: Pickup Code Display

*For any* successful reservation response containing a pickup code, the code must be displayed in the UI

**Validates: Requirements 4.3, 5.3**

### Property 15: Pickup Instructions Completeness

*For any* reservation confirmation, the displayed information must include vendor name, pickup location, and expiry time

**Validates: Requirements 4.4**

### Property 16: Clipboard Copy Functionality

*For any* pickup code, triggering the copy function should result in the code being written to the clipboard

**Validates: Requirements 4.5**

### Property 17: Reservation Quantity Validation

*For any* reservation quantity input, validation should prevent values exceeding the available quantity

**Validates: Requirements 4.6, 9.3**

### Property 18: Claim Button Presence

*For any* listing displayed to an organization, a claim button with quantity selector must be present in the rendered output

**Validates: Requirements 5.1**

### Property 19: Claim API Call Correctness

*For any* claim attempt, the POST request should target `/listings/{id}/reserve` with organization name and quantity in the payload

**Validates: Requirements 5.2**

### Property 20: Partial Sponsorship Amount Display

*For any* listing with sponsor_pct < 100, the amount owed should be displayed in PKR

**Validates: Requirements 5.4**

### Property 21: Photo Format Validation

*For any* photo upload attempt, only files with mime types image/jpeg, image/png, or image/webp should be accepted

**Validates: Requirements 6.2, 7.6**

### Property 22: Photo Size Validation

*For any* photo upload attempt, only files with size ≤ 5MB should be accepted

**Validates: Requirements 6.3, 7.6**

### Property 23: Vendor Listing API Format

*For any* vendor form submission, the POST request should use multipart/form-data format and include source=restaurant

**Validates: Requirements 6.4**

### Property 24: Price Relationship Validation

*For any* listing form submission, validation should enforce current_price ≤ original_price

**Validates: Requirements 6.5**

### Property 25: Future Expiry Time Validation

*For any* expiry time input, validation should enforce that the time is in the future

**Validates: Requirements 6.6**

### Property 26: Submission Confirmation Display

*For any* successful listing submission response, a confirmation message must be displayed

**Validates: Requirements 6.7**

### Property 27: Sponsor Percentage Range Validation

*For any* sponsor_pct input, validation should enforce that the value is between 1 and 100 inclusive

**Validates: Requirements 7.2**

### Property 28: Sponsored Listing API Format

*For any* donor sponsored form submission, the POST request should use multipart/form-data format and include source=sponsored

**Validates: Requirements 7.3**

### Property 29: Organization Price Calculation

*For any* original price and sponsor percentage pair, the calculated org_price should equal original_price × (100 - sponsor_pct) / 100

**Validates: Requirements 7.4**

### Property 30: Prepared Time Validation

*For any* prepared_at input, validation should enforce that the time is in the past but within 24 hours

**Validates: Requirements 8.3**

### Property 31: Expiry After Prepared Validation

*For any* prepared_at and expiry_time pair, validation should enforce that expiry_time > prepared_at

**Validates: Requirements 8.4**

### Property 32: Donated Listing API Format

*For any* donation form submission, the POST request should include source=donated, sponsor_pct=100, and org_price=0

**Validates: Requirements 8.5**

### Property 33: Donation Confirmation Message

*For any* successful donation submission, a confirmation message indicating free availability to organizations must be displayed

**Validates: Requirements 8.6**

### Property 34: Sponsor Button Presence

*For any* listing displayed to a donor in the public feed, a "Sponsor" button must be present

**Validates: Requirements 9.1**

### Property 35: Sponsor Form Display

*For any* sponsor button click, a form with donor_name, quantity, and sponsor_pct fields must appear

**Validates: Requirements 9.2**

### Property 36: Sponsor API Call Correctness

*For any* sponsor form submission, the POST request should target `/listings/{id}/sponsor` with donor_name, units, and sponsor_pct in the payload

**Validates: Requirements 9.4**

### Property 37: Sponsor Cost Calculation

*For any* sponsor parameters (units, original_price, sponsor_pct), the displayed total cost should equal units × original_price × sponsor_pct / 100

**Validates: Requirements 9.5**

### Property 38: Sponsor Confirmation Message

*For any* successful sponsor response, a confirmation message indicating units moved to organizations feed must be displayed

**Validates: Requirements 9.6**

### Property 39: Pickup Code Length Validation

*For any* pickup code input, validation should enforce exactly 6 alphanumeric characters

**Validates: Requirements 10.2**

### Property 40: Pickup API Call Correctness

*For any* pickup code submission, the POST request should target `/listings/{id}/pickup` with the pickup_code in the payload

**Validates: Requirements 10.3**

### Property 41: Pickup Confirmation Display

*For any* successful pickup response, a confirmation message indicating the food was marked as collected must be displayed

**Validates: Requirements 10.4**

### Property 42: Organization Registration API Call

*For any* organization registration form submission, the POST request should target `/organizations` with the form data in the payload

**Validates: Requirements 11.2**

### Property 43: Organization Display Field Completeness

*For any* organization rendered in the list, all required fields (name, type, area, daily_need) must appear in the rendered output

**Validates: Requirements 11.4**

### Property 44: Organization Grouping by Type

*For any* set of organizations, the displayed groups should correctly separate shelters from orphanages

**Validates: Requirements 11.5**

### Property 45: Donor Impact API Call

*For any* donor name entered in the impact view, the GET request should target `/donors/{name}/impact` with the name properly URL-encoded

**Validates: Requirements 12.2**

### Property 46: Impact Metrics Display

*For any* impact data response, all required metrics (total units collected, total PKR value, number of organizations served) must appear in the rendered output

**Validates: Requirements 12.3**

### Property 47: Impact Breakdown Display

*For any* impact data containing listings, the breakdown should display vendor name and organization for each collected item

**Validates: Requirements 12.4**

### Property 48: Collected Status Filtering

*For any* impact data, only listings with collected status should be included in the displayed results

**Validates: Requirements 12.5**

### Property 49: Chat Message API Call

*For any* chat message sent, the POST request should target `/chat` with the user's role and full message history in the payload

**Validates: Requirements 13.2**

### Property 50: Listing Event Rendering

*For any* SSE event with type=listings, listing cards with images must be rendered in the chat

**Validates: Requirements 13.4**

### Property 51: Token Streaming

*For any* SSE event with type=token, the token should be appended to the current chat response

**Validates: Requirements 13.5**

### Property 52: Response Completion Marking

*For any* SSE event with type=done, the response should be marked as complete

**Validates: Requirements 13.6**

### Property 53: Role-Based Action Buttons in Chat

*For any* listing card rendered in chat, the action button (Reserve/Claim) should match the user's role

**Validates: Requirements 13.8, 15.3, 15.4**

### Property 54: Voice Permission Request

*For any* voice button click, a microphone permission request should be triggered

**Validates: Requirements 14.2**

### Property 55: Voice Recognition Start

*For any* granted microphone permission, speech recognition should start with the configured language (en-US or ur-PK)

**Validates: Requirements 14.3**

### Property 56: Transcription Display

*For any* speech recognition result, the transcribed text must appear in the chat input field

**Validates: Requirements 14.4**

### Property 57: Auto-Send Transcription

*For any* transcribed text, the message should be automatically sent to the backend via POST /chat

**Validates: Requirements 14.5**

### Property 58: Speech Synthesis Trigger

*For any* text response token received during voice mode, speech synthesis should be triggered to speak the response

**Validates: Requirements 14.6**

### Property 59: Voice Recognition Indicator

*For any* active voice recognition session, a visual indicator must be displayed

**Validates: Requirements 14.7**

### Property 60: Listing JSON Parsing

*For any* SSE listing event containing JSON data, the parsing should correctly extract listing objects

**Validates: Requirements 15.1**

### Property 61: Chat Listing Card Field Completeness

*For any* listing rendered in the chat context, all required fields (image, title, vendor name, quantity, price, location, expiry time) must appear

**Validates: Requirements 15.2**

### Property 62: Listings Before Text Rendering Order

*For any* chat response containing both listings and text, listing cards should render before text tokens begin streaming

**Validates: Requirements 15.5**

### Property 63: Chat Scroll Maintenance

*For any* incoming chat token, the scroll position should remain at the bottom of the message list

**Validates: Requirements 15.6**

### Property 64: Mobile Font Size Minimum

*For any* text element rendered on mobile viewport, the font size should be at least 14px

**Validates: Requirements 16.3**

### Property 65: Image Aspect Ratio Preservation

*For any* listing image with a specific aspect ratio, the rendered image should preserve that aspect ratio

**Validates: Requirements 16.4**

### Property 66: Touch Target Size Minimum

*For any* interactive element (button, link, input), the touch target size should be at least 44×44 pixels

**Validates: Requirements 16.5**

### Property 67: Keyboard Navigation Support

*For any* interactive element, keyboard navigation (Tab, Enter) should function correctly

**Validates: Requirements 16.6**

### Property 68: HTTP Error Display

*For any* API response with HTTP error status, a user-friendly error message must be displayed

**Validates: Requirements 17.1**

### Property 69: Network Error Display

*For any* network request failure, a connection error message must be displayed

**Validates: Requirements 17.2**

### Property 70: Form Validation Error Display

*For any* form validation failure, invalid fields should be highlighted with specific error messages

**Validates: Requirements 17.3**

### Property 71: Loading Indicator Display

*For any* API request in progress, a loading indicator must be displayed

**Validates: Requirements 17.5**

### Property 72: Feed Update Addition

*For any* poll response containing new listings not in the current feed, those listings should be added to the displayed feed

**Validates: Requirements 18.2**

### Property 73: Quantity Update Reflection

*For any* poll response with listing quantities different from the current feed, the displayed quantities should be updated

**Validates: Requirements 18.3**

### Property 74: Feed Update Timestamp Display

*For any* feed refresh, a timestamp showing the last update time must be displayed

**Validates: Requirements 18.5**

### Property 75: Time Remaining Calculation

*For any* expiry timestamp, the displayed time remaining should accurately represent the duration until expiry

**Validates: Requirements 19.2**

### Property 76: 24-Hour Time Format

*For any* absolute time display, the format should use 24-hour notation (HH:mm)

**Validates: Requirements 19.6**

### Property 77: Image Lazy Loading

*For any* listing image entering the viewport, the image should be loaded using lazy loading behavior

**Validates: Requirements 20.5**

## Browser Compatibility Notes

- **Web Speech API**: Optimized for Chrome and Edge. Firefox has limited support, Safari has basic support.
- **EventSource (SSE)**: Supported in all modern browsers
- **Intersection Observer (Lazy Loading)**: Supported in all modern browsers
- **CSS Grid/Flexbox**: Supported in all modern browsers
- **ES6+ Features**: Transpiled by Vite for broader compatibility

## Future Enhancements

- Push notifications for expiring listings
- Map integration for pickup locations
- Multi-language UI (Urdu interface)
- Progressive Web App (PWA) with offline support
- Admin dashboard for platform analytics
- SMS notifications for pickup codes
- QR code generation for pickup codes
- Photo compression on backend
- Real-time websocket updates (replacing polling)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-27  
**Author**: AI Design Agent  
**Status**: Ready for Implementation
