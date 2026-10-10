# Implementation Plan: SaveFood Frontend

## Overview

This plan breaks down the SaveFood frontend implementation into manageable chunks suitable for hackathon development. The frontend is a React + TypeScript + Vite application with dual interaction modes (text chat and voice), integrating with a FastAPI backend. The implementation prioritizes core features first, with optional testing tasks that can be skipped for faster MVP delivery.

## Tasks

- [x] 1. Project setup and foundation
  - Initialize Vite + React + TypeScript project
  - Install dependencies: React Router, Tailwind CSS, Axios, React Hook Form, Zod, date-fns-tz, React Query
  - Configure Tailwind with responsive breakpoints and custom spacing
  - Set up project structure with folders: components, hooks, context, services, utils, types
  - Create base API client with axios (baseURL: http://localhost:8000, timeout: 30s)
  - Set up ErrorBoundary component for top-level error handling
  - _Requirements: 20.2, 20.6_

- [ ]* 1.1 Write property tests for validation utilities
  - **Property 21: Photo Format Validation**
  - **Property 22: Photo Size Validation**
  - **Property 24: Price Relationship Validation**
  - **Property 25: Future Expiry Time Validation**
  - **Property 27: Sponsor Percentage Range Validation**
  - **Property 30: Prepared Time Validation**
  - **Property 31: Expiry After Prepared Validation**
  - **Property 39: Pickup Code Length Validation**
  - **Validates: Requirements 6.2, 6.3, 6.5, 6.6, 7.2, 8.3, 8.4, 10.2**

- [ ] 2. Core type definitions and utilities
  - [ ] 2.1 Create TypeScript type definitions
    - Define Role, ListingSource, Listing, ReservationRequest, ReservationResponse, SponsorRequest types
    - Define ChatMessage, SSEEvent types
    - Define Organization, ImpactData types
    - _Requirements: All - foundational types_
  
  - [ ] 2.2 Implement validation utilities
    - Create validatePhotoFile (format: jpg/png/webp, size: ≤5MB)
    - Create validatePickupCode (exactly 6 alphanumeric characters)
    - Create validateFutureTime (time must be > now)
    - Create validatePreparedAt (past but within 24 hours)
    - Create validatePriceRelationship (current ≤ original)
    - _Requirements: 6.2, 6.3, 6.5, 6.6, 8.3, 10.2_
  
  - [ ] 2.3 Implement formatting utilities
    - Create formatPKR (display with PKR prefix and locale formatting)
    - Create formatQuantity (singular/plural units)
    - Create calculateOrgPrice (original × (100 - sponsor_pct) / 100)
    - Create calculateSponsorCost (units × original × sponsor_pct / 100)
    - _Requirements: 2.7, 7.4, 9.5_
  
  - [ ] 2.4 Implement timezone utilities
    - Create formatKarachiTime (convert to Asia/Karachi, format as HH:mm)
    - Create formatTimeRemaining (distance to expiry)
    - Create getUrgencyLevel (normal/warning/critical based on time remaining)
    - _Requirements: 2.4, 19.1, 19.2, 19.3_

- [ ]* 2.5 Write property tests for formatting and calculation utilities
  - **Property 7: PKR Currency Formatting**
  - **Property 29: Organization Price Calculation**
  - **Property 37: Sponsor Cost Calculation**
  - **Property 75: Time Remaining Calculation**
  - **Validates: Requirements 2.7, 7.4, 9.5, 19.2**

- [ ] 3. Role management and context
  - [ ] 3.1 Create RoleContext with provider
    - Define RoleState interface (role, setRole)
    - Implement RoleProvider with useState
    - Store role in sessionStorage on change
    - _Requirements: 1.2_
  
  - [ ] 3.2 Create useRole hook
    - Access RoleContext
    - Sync role to sessionStorage
    - Return role state and setter
    - _Requirements: 1.2_
  
  - [ ] 3.3 Build RoleSelector component
    - Display four role cards: buyer, org, vendor, donor
    - Handle role selection and update context
    - Trigger navigation to appropriate dashboard
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

- [ ]* 3.4 Write property tests for role persistence
  - **Property 1: Role Persistence**
  - **Validates: Requirements 1.2**

- [ ] 4. Service layer for API integration
  - [ ] 4.1 Create listingService
    - Implement getListings(role) → GET /listings?role={role}
    - Implement createListing(formData) → POST /listings (multipart)
    - Implement reserveListing(id, data) → POST /listings/{id}/reserve
    - Implement sponsorListing(id, data) → POST /listings/{id}/sponsor
    - Implement confirmPickup(id, code) → POST /listings/{id}/pickup
    - _Requirements: 2.1, 3.1, 4.2, 5.2, 6.4, 9.4, 10.3_
  
  - [ ] 4.2 Create chatService
    - Implement sendMessage to handle POST /chat and return EventSource
    - Handle SSE connection setup
    - _Requirements: 13.2_
  
  - [ ] 4.3 Create organizationService
    - Implement getOrganizations() → GET /organizations
    - Implement registerOrganization(data) → POST /organizations
    - _Requirements: 11.2, 11.3_
  
  - [ ] 4.4 Create donorService
    - Implement getImpact(name) → GET /donors/{name}/impact
    - URL-encode donor name
    - _Requirements: 12.2_

- [ ]* 4.5 Write property tests for API service functions
  - **Property 2: API Request Role Inclusion**
  - **Property 13: Reservation API Call Correctness**
  - **Property 19: Claim API Call Correctness**
  - **Property 23: Vendor Listing API Format**
  - **Property 28: Sponsored Listing API Format**
  - **Property 32: Donated Listing API Format**
  - **Property 36: Sponsor API Call Correctness**
  - **Property 40: Pickup API Call Correctness**
  - **Property 42: Organization Registration API Call**
  - **Property 45: Donor Impact API Call**
  - **Property 49: Chat Message API Call**
  - **Validates: Requirements 1.7, 4.2, 5.2, 6.4, 7.3, 8.5, 9.4, 10.3, 11.2, 12.2, 13.2**

- [ ] 5. Checkpoint - Core foundation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Shared UI components
  - [ ] 6.1 Build basic shared components
    - Create Button component with variants and loading state
    - Create Input component with error display
    - Create Card component for listings
    - Create Modal component with overlay and close handling
    - Create LoadingSpinner component
    - Create ErrorMessage component
    - Ensure minimum 44×44px touch targets for mobile
    - _Requirements: 16.5, 17.1, 17.2, 17.5_
  
  - [ ] 6.2 Build ExpiryTimer component
    - Display time remaining until expiry
    - Update every minute
    - Apply urgency styling: red for <2h, pulsing for <30min
    - Display absolute time in HH:mm format (Asia/Karachi)
    - _Requirements: 19.2, 19.3, 19.4, 19.5, 19.6_
  
  - [ ] 6.3 Build ImageUpload component
    - Handle file input with drag-and-drop
    - Validate file format (jpg/png/webp) and size (≤5MB)
    - Display preview before upload
    - Show validation errors
    - _Requirements: 6.2, 6.3_

- [ ]* 6.4 Write property tests for shared components
  - **Property 11: Expiry Urgency Styling**
  - **Property 66: Touch Target Size Minimum**
  - **Property 68: HTTP Error Display**
  - **Property 69: Network Error Display**
  - **Property 70: Form Validation Error Display**
  - **Property 71: Loading Indicator Display**
  - **Validates: Requirements 3.5, 16.5, 17.1, 17.2, 17.3, 17.5, 19.3, 19.4**

- [ ] 7. Feed system components
  - [ ] 7.1 Create usePolling hook
    - Accept fetchFn and interval parameters
    - Fetch data initially and at intervals
    - Track lastUpdated timestamp
    - Provide manual refresh function
    - _Requirements: 2.6, 3.6, 18.1_
  
  - [ ] 7.2 Build ListingCard component
    - Display listing with image (lazy-loaded), title, vendor name, quantity, price, location, expiry
    - Render image from /uploads/{file} URL
    - Show ExpiryTimer for expiry time
    - Display role-based action buttons (Reserve/Claim/Sponsor)
    - Use Intersection Observer for lazy loading images
    - Preserve image aspect ratios
    - _Requirements: 2.2, 2.3, 2.4, 4.1, 5.1, 9.1, 16.4, 20.5_
  
  - [ ] 7.3 Build FeedContainer component
    - Abstract container for PublicFeed and OrgsFeed
    - Use usePolling hook with 60-second interval
    - Display loading spinner, error messages
    - Show last updated timestamp
    - Provide manual refresh button
    - _Requirements: 18.5, 18.6_
  
  - [ ] 7.4 Build PublicFeed component
    - Fetch listings with role=buyer
    - Filter out listings with quantity=0
    - Render ListingCard for each listing
    - Show Sponsor button when role is donor
    - Display prices in PKR format
    - _Requirements: 2.1, 2.5, 2.7_
  
  - [ ] 7.5 Build OrgsFeed component
    - Fetch listings with role=org
    - Display donor names for sponsored/donated listings
    - Show "Free" for 100% sponsored items
    - Display prepared_at for donated listings
    - Highlight listings expiring within 2 hours
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 7.6 Write property tests for feed components
  - **Property 3: Listing Field Completeness**
  - **Property 4: Image URL Path Correctness**
  - **Property 5: Timezone Conversion**
  - **Property 6: Zero Quantity Filtering**
  - **Property 8: Organization Listing Field Completeness**
  - **Property 9: Full Sponsorship Display**
  - **Property 10: Donated Listing Prepared Time Display**
  - **Property 12: Reservation Button Presence**
  - **Property 18: Claim Button Presence**
  - **Property 34: Sponsor Button Presence**
  - **Property 64: Mobile Font Size Minimum**
  - **Property 65: Image Aspect Ratio Preservation**
  - **Property 72: Feed Update Addition**
  - **Property 73: Quantity Update Reflection**
  - **Property 74: Feed Update Timestamp Display**
  - **Property 76: 24-Hour Time Format**
  - **Property 77: Image Lazy Loading**
  - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 3.2, 3.3, 3.4, 3.5, 4.1, 5.1, 9.1, 16.3, 16.4, 18.2, 18.3, 18.5, 19.6, 20.5**

- [ ] 8. Checkpoint - Feed system complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Reservation and claiming functionality
  - [ ] 9.1 Build useClipboard hook
    - Implement copy function using navigator.clipboard API
    - Track copied state (show for 2 seconds)
    - Handle copy errors gracefully
    - _Requirements: 4.5_
  
  - [ ] 9.2 Build ReservationModal component
    - Display quantity selector (validate ≤ available quantity)
    - Input field for buyer/org name
    - Calculate and show amount for partial sponsorship
    - Submit POST to /listings/{id}/reserve
    - Show validation errors
    - Open PickupCodeDisplay on success
    - _Requirements: 4.1, 4.2, 4.6, 4.7, 5.1, 5.2, 5.4_
  
  - [ ] 9.3 Build PickupCodeDisplay component
    - Display 6-character pickup code in large font
    - Show vendor name, pickup location, expiry time
    - Display amount owed in PKR (or "Free"/"No payment required" for 100% sponsored)
    - Copy-to-clipboard button using useClipboard hook
    - Print/Save options
    - _Requirements: 4.3, 4.4, 4.5, 5.3, 5.6_

- [ ]* 9.4 Write property tests for reservation components
  - **Property 14: Pickup Code Display**
  - **Property 15: Pickup Instructions Completeness**
  - **Property 16: Clipboard Copy Functionality**
  - **Property 17: Reservation Quantity Validation**
  - **Property 20: Partial Sponsorship Amount Display**
  - **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 5.4**

- [ ] 10. Vendor listing creation
  - [ ] 10.1 Build VendorListingForm component
    - Create form with React Hook Form + Zod validation
    - Fields: vendor_name, title, qty, original_price, current_price, pickup_location, expiry_time, photo
    - Validate current_price ≤ original_price
    - Validate expiry_time is in future
    - Validate photo format and size using ImageUpload
    - Submit as multipart/form-data with source=restaurant
    - Display confirmation on success
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [ ]* 10.2 Write property tests for vendor form
  - **Property 26: Submission Confirmation Display**
  - **Validates: Requirements 6.7**

- [ ] 11. Donor listing creation
  - [ ] 11.1 Build DonorSponsoredForm component
    - Create form with fields: donor_name, vendor_name, title, qty, original_price, sponsor_pct, pickup_location, expiry_time, photo
    - Validate sponsor_pct between 1-100
    - Calculate org_price dynamically: original_price × (100 - sponsor_pct) / 100
    - Display "Organizations will receive this for free" when sponsor_pct=100
    - Submit with source=sponsored
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ] 11.2 Build DonorDonationForm component
    - Create form with fields: donor_name, title, qty, pickup_location, prepared_at, expiry_time, dietary_notes, photo
    - Validate prepared_at is past but within 24 hours
    - Validate expiry_time > prepared_at
    - Submit with source=donated, sponsor_pct=100, org_price=0
    - Display confirmation about free availability
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [ ] 11.3 Build SponsorExistingModal component
    - Trigger from PublicFeed Sponsor button
    - Form fields: donor_name, units (validate ≤ available), sponsor_pct (1-100)
    - Calculate total cost: units × original_price × sponsor_pct / 100
    - Display cost in PKR format
    - Submit POST to /listings/{id}/sponsor
    - Show confirmation that units moved to orgs feed
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ]* 11.4 Write property tests for donor forms
  - **Property 33: Donation Confirmation Message**
  - **Property 35: Sponsor Form Display**
  - **Property 38: Sponsor Confirmation Message**
  - **Validates: Requirements 8.6, 9.2, 9.6**

- [ ] 12. Vendor and donor dashboards
  - [ ] 12.1 Build VendorDashboard component
    - Display list of vendor's active listings
    - Show pickup codes for reserved items
    - Include PickupCodeEntry component
    - _Requirements: 10.6_
  
  - [ ] 12.2 Build PickupCodeEntry component
    - Input field with 6-character validation
    - Submit POST to /listings/{id}/pickup with pickup_code
    - Display success confirmation
    - Display error for invalid codes
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 12.3 Build DonorDashboard component
    - Provide options: sponsor existing, sponsored listing, donate own food
    - Include ImpactView component
    - _Requirements: 1.6_
  
  - [ ] 12.4 Build ImpactView component
    - Input field for donor name
    - Fetch GET /donors/{name}/impact
    - Display metrics: total units collected, total PKR value, organizations served
    - Show breakdown table: vendor name, food item, organization, quantity
    - Filter to only show collected items
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 12.5 Write property tests for vendor/donor dashboards
  - **Property 41: Pickup Confirmation Display**
  - **Property 46: Impact Metrics Display**
  - **Property 47: Impact Breakdown Display**
  - **Property 48: Collected Status Filtering**
  - **Validates: Requirements 10.4, 12.3, 12.4, 12.5**

- [ ] 13. Checkpoint - Core listing flows complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Organization management
  - [ ] 14.1 Build OrganizationRegistry component
    - Create form with fields: name, type (dropdown: shelter/orphanage), area, daily_need, dietary_notes
    - Submit POST to /organizations
    - Display OrganizationList on success
    - _Requirements: 11.1, 11.2_
  
  - [ ] 14.2 Build OrganizationList component
    - Fetch GET /organizations
    - Display organization cards with name, type, area, daily_need
    - Group organizations by type (shelter vs orphanage)
    - _Requirements: 11.3, 11.4, 11.5_

- [ ]* 14.3 Write property tests for organization components
  - **Property 43: Organization Display Field Completeness**
  - **Property 44: Organization Grouping by Type**
  - **Validates: Requirements 11.4, 11.5**

- [ ] 15. Chat interface foundation
  - [ ] 15.1 Create ChatContext with provider
    - Define message state (array of ChatMessage)
    - Track streaming status
    - Provide sendMessage function
    - _Requirements: 13.1_
  
  - [ ] 15.2 Create useSSE hook
    - Accept URL and onMessage callback
    - Set up EventSource connection
    - Handle message events and parse JSON
    - Handle error events and connection failures
    - Provide connect/disconnect functions
    - Display retry option on connection loss
    - _Requirements: 13.3, 17.7_
  
  - [ ] 15.3 Create useChat hook
    - Manage messages array
    - Access role from useRole
    - Implement sendMessage function (add user message, trigger SSE)
    - Handle SSE events: listings, token, done
    - Track isStreaming state
    - _Requirements: 13.2, 13.4, 13.5, 13.6_
  
  - [ ] 15.4 Build ChatMessage component
    - Render user/assistant messages
    - For assistant with listings: render ListingCardInChat before text
    - Support markdown formatting
    - Display timestamp
    - _Requirements: 15.1, 15.2, 15.5_
  
  - [ ] 15.5 Build ListingCardInChat component
    - Simplified ListingCard for chat context
    - Display all required fields: image, title, vendor, quantity, price, location, expiry
    - Show Reserve button for buyers, Claim button for orgs
    - Open ReservationModal on click
    - _Requirements: 13.8, 15.2, 15.3, 15.4_
  
  - [ ] 15.6 Build ChatMessageList component
    - Render list of ChatMessage components
    - Auto-scroll to bottom as tokens arrive
    - _Requirements: 15.6_
  
  - [ ] 15.7 Build ChatInput component
    - Text input field with send button
    - Submit message on Enter key
    - Clear input after sending
    - _Requirements: 13.1_
  
  - [ ] 15.8 Build ChatContainer component
    - Use useChat hook for state management
    - Render ChatMessageList and ChatInput
    - Handle loading and error states
    - _Requirements: 13.1, 13.2_

- [ ]* 15.9 Write property tests for chat components
  - **Property 50: Listing Event Rendering**
  - **Property 51: Token Streaming**
  - **Property 52: Response Completion Marking**
  - **Property 53: Role-Based Action Buttons in Chat**
  - **Property 60: Listing JSON Parsing**
  - **Property 61: Chat Listing Card Field Completeness**
  - **Property 62: Listings Before Text Rendering Order**
  - **Property 63: Chat Scroll Maintenance**
  - **Validates: Requirements 13.4, 13.5, 13.6, 13.8, 15.1, 15.2, 15.5, 15.6**

- [ ] 16. Voice interface
  - [ ] 16.1 Create useVoice hook
    - Check browser support for Web Speech API
    - Set up SpeechRecognition with language (en-US or ur-PK)
    - Implement startListening function (continuous=false, interimResults=false)
    - Implement speak function using SpeechSynthesis
    - Track isListening state
    - Return isSupported flag
    - _Requirements: 14.1, 14.3, 14.6_
  
  - [ ] 16.2 Build VoiceButton component
    - Display microphone icon
    - Request permission on click
    - Show pulsing animation when listening
    - Hide if Web Speech API not supported
    - Display browser recommendation (Chrome/Edge) when unsupported
    - _Requirements: 14.1, 14.2, 14.7, 14.8_
  
  - [ ] 16.3 Integrate voice with ChatInput
    - Add VoiceButton to ChatInput component
    - On voice result: populate input field with transcript
    - Auto-send transcribed message
    - On assistant response: trigger speech synthesis
    - _Requirements: 14.4, 14.5, 14.6_

- [ ]* 16.4 Write property tests for voice interface
  - **Property 54: Voice Permission Request**
  - **Property 55: Voice Recognition Start**
  - **Property 56: Transcription Display**
  - **Property 57: Auto-Send Transcription**
  - **Property 58: Speech Synthesis Trigger**
  - **Property 59: Voice Recognition Indicator**
  - **Validates: Requirements 14.2, 14.3, 14.4, 14.5, 14.6, 14.7**

- [ ] 17. Checkpoint - Chat and voice complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Layout and routing
  - [ ] 18.1 Build Header component
    - Display app logo and name
    - Show current role badge
    - Navigation controls
    - _Requirements: 16.1_
  
  - [ ] 18.2 Build SplitScreenLayout component
    - Left pane: ChatContainer
    - Right pane: role-specific content
    - Responsive: stacked on mobile, side-by-side on desktop
    - _Requirements: 16.1, 16.2_
  
  - [ ] 18.3 Build AppLayout component
    - Include Header and navigation
    - Render role-specific dashboards based on session state
    - Wrap with RoleProvider and ChatProvider
    - _Requirements: 1.3, 1.4, 1.5, 1.6_
  
  - [ ] 18.4 Set up React Router
    - Define routes: /, /buyer, /org, /vendor, /donor
    - Implement route guards based on role
    - Set up lazy loading for route components
    - _Requirements: 16.1_

- [ ]* 18.5 Write property tests for layout
  - **Property 67: Keyboard Navigation Support**
  - **Validates: Requirements 16.6**

- [ ] 19. Performance optimizations
  - [ ] 19.1 Implement code splitting
    - Lazy load PublicFeed, OrgsFeed, VendorDashboard, DonorDashboard
    - Configure manual chunks for vendor libraries
    - _Requirements: 20.1_
  
  - [ ] 19.2 Optimize images
    - Implement client-side resize before upload using Canvas API
    - Configure image lazy loading with Intersection Observer
    - _Requirements: 20.4, 20.5_
  
  - [ ] 19.3 Configure React Query
    - Set staleTime: 60s, cacheTime: 5min
    - Disable refetchOnWindowFocus
    - _Requirements: 18.1_
  
  - [ ] 19.4 Configure build optimizations
    - Enable minification and tree shaking
    - Configure cache headers for static assets
    - Set up compression (gzip/brotli)
    - _Requirements: 20.1, 20.6_

- [ ] 20. Error handling and edge cases
  - [ ] 20.1 Enhance API error handling
    - Add axios interceptor for response errors
    - Distinguish between API errors, network errors, unknown errors
    - Display user-friendly messages
    - _Requirements: 17.1, 17.2_
  
  - [ ] 20.2 Add request timeouts
    - Configure 30-second timeout on all requests
    - Display timeout error messages
    - _Requirements: 17.6_
  
  - [ ] 20.3 Handle listing unavailability
    - Display message when item claimed by someone else
    - Refresh feed after failed reservation
    - _Requirements: 17.4_
  
  - [ ] 20.4 Add loading states
    - Display spinners during API requests
    - Show skeleton loaders for feeds
    - _Requirements: 17.5_

- [ ] 21. Final integration and polish
  - [ ] 21.1 Wire all components together in App.tsx
    - Set up providers (RoleProvider, QueryClientProvider)
    - Configure error boundary
    - Set up routing with lazy-loaded components
    - _Requirements: All_
  
  - [ ] 21.2 Test responsive design
    - Verify mobile layout (stacked, touch targets ≥44px, font ≥14px)
    - Verify tablet layout
    - Verify desktop layout (split-screen)
    - _Requirements: 16.1, 16.2, 16.3, 16.5_
  
  - [ ] 21.3 Test browser compatibility
    - Verify Chrome, Firefox, Safari, Edge support
    - Test voice features specifically on Chrome/Edge
    - Display warnings for unsupported browsers
    - _Requirements: 20.2, 20.3_
  
  - [ ] 21.4 Accessibility review
    - Verify semantic HTML elements
    - Add ARIA labels where needed
    - Test keyboard navigation (Tab, Enter, Escape)
    - Check focus management for modals
    - _Requirements: 16.6_
  
  - [ ] 21.5 Environment configuration
    - Create .env file with VITE_API_BASE_URL, VITE_POLLING_INTERVAL, VITE_REQUEST_TIMEOUT
    - Document environment variables in README
    - _Requirements: All_

- [ ] 22. Final checkpoint - Full application ready
  - Run full test suite
  - Test all user flows end-to-end
  - Verify all requirements are met
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- The implementation uses React 18 + TypeScript + Vite with Tailwind CSS for styling
- Backend integration is via REST APIs (axios) and Server-Sent Events for chat streaming
- Voice features use the Web Speech API and are optimized for Chrome/Edge browsers
- All times are displayed in Asia/Karachi timezone
- All prices are formatted in Pakistani Rupees (PKR)
- The application supports English, Urdu, and Roman Urdu through the AI chatbot

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4"] },
    { "id": 2, "tasks": ["2.5", "3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "4.1", "4.2", "4.3", "4.4"] },
    { "id": 4, "tasks": ["4.5", "6.1", "6.2", "6.3"] },
    { "id": 5, "tasks": ["6.4", "7.1", "7.2"] },
    { "id": 6, "tasks": ["7.3", "7.4", "7.5"] },
    { "id": 7, "tasks": ["7.6", "9.1", "9.2", "9.3"] },
    { "id": 8, "tasks": ["9.4", "10.1"] },
    { "id": 9, "tasks": ["10.2", "11.1", "11.2", "11.3"] },
    { "id": 10, "tasks": ["11.4", "12.1", "12.2", "12.3", "12.4"] },
    { "id": 11, "tasks": ["12.5", "14.1", "14.2"] },
    { "id": 12, "tasks": ["14.3", "15.1", "15.2", "15.3"] },
    { "id": 13, "tasks": ["15.4", "15.5", "15.6", "15.7"] },
    { "id": 14, "tasks": ["15.8", "15.9", "16.1", "16.2"] },
    { "id": 15, "tasks": ["16.3", "16.4"] },
    { "id": 16, "tasks": ["18.1", "18.2", "18.3", "18.4"] },
    { "id": 17, "tasks": ["18.5", "19.1", "19.2", "19.3", "19.4"] },
    { "id": 18, "tasks": ["20.1", "20.2", "20.3", "20.4"] },
    { "id": 19, "tasks": ["21.1", "21.2", "21.3", "21.4", "21.5"] }
  ]
}
```
