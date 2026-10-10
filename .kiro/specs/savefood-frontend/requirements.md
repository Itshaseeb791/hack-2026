# Requirements Document

## Introduction

SaveFood is a food redistribution platform that connects restaurants, donors, buyers, and charitable organizations to reduce food waste. This document specifies requirements for the frontend web application and its integration with the AI chatbot agent. The frontend enables four user roles to interact with the platform: buyers seeking discounted food, charitable organizations (shelters and orphanages) claiming free or subsidized food, vendors (restaurants/bakeries) listing surplus food, and donors sponsoring or donating food items.

The system operates without authentication, uses a FastAPI backend with PostgreSQL, and integrates with DeepSeek AI for natural language querying in English, Urdu, and Roman Urdu. All monetary values are in Pakistani Rupees (PKR), and the system operates in the Asia/Karachi timezone.

## Glossary

- **SaveFood_Frontend**: The web application interface that users interact with
- **Backend_API**: The FastAPI server at `http://localhost:8000` providing REST endpoints and AI chat
- **Listing**: A food item available for reservation or claim (restaurant surplus, sponsored, or donated)
- **Public_Feed**: Listings visible to buyers with `audience=public`
- **Orgs_Feed**: Listings visible to charitable organizations with `audience=orgs_only`
- **Buyer**: A price-sensitive individual seeking discounted restaurant surplus food
- **Organization**: A shelter or orphanage claiming free or subsidized food
- **Vendor**: A restaurant or bakery posting surplus food listings
- **Donor**: An individual sponsoring restaurant food or donating their own food
- **Pickup_Code**: A 6-character alphanumeric code generated when food is reserved or claimed
- **Sponsor_Percentage**: The portion (1-100%) of a listing's original price covered by a donor
- **Web_Speech_API**: Browser API for speech recognition and synthesis
- **SSE**: Server-Sent Events, a protocol for streaming responses from server to client
- **DeepSeek**: The AI language model powering the chatbot through OpenAI-compatible API
- **Voice_Mode**: Browser-based speech input using Web Speech API (Chrome/Edge optimized)
- **Impact_View**: A summary showing collected food quantities for a specific donor

## Requirements

### Requirement 1: Role Selection and Context

**User Story:** As a user, I want to select my role when entering the platform, so that I see content relevant to my purpose

#### Acceptance Criteria

1. THE SaveFood_Frontend SHALL provide four role options: `buyer`, `org`, `vendor`, and `donor`
2. WHEN a user selects a role, THE SaveFood_Frontend SHALL store the role selection in browser session state
3. WHEN a user selects the `buyer` role, THE SaveFood_Frontend SHALL display the public feed interface
4. WHEN a user selects the `org` role, THE SaveFood_Frontend SHALL display the organizations feed interface
5. WHEN a user selects the `vendor` role, THE SaveFood_Frontend SHALL display the vendor listing creation interface
6. WHEN a user selects the `donor` role, THE SaveFood_Frontend SHALL display the donor sponsorship interface
7. THE SaveFood_Frontend SHALL include the selected role in all Backend_API requests

### Requirement 2: Public Feed for Buyers

**User Story:** As a buyer, I want to browse discounted restaurant surplus food, so that I can purchase quality meals at lower prices

#### Acceptance Criteria

1. WHEN the user role is `buyer`, THE SaveFood_Frontend SHALL fetch listings from `GET /listings?role=buyer`
2. THE SaveFood_Frontend SHALL display each listing with title, vendor name, quantity available, current price per unit, pickup location, expiry time, and image
3. THE SaveFood_Frontend SHALL render listing images from `/uploads/{file}` URLs provided by Backend_API
4. THE SaveFood_Frontend SHALL display expiry time in Asia/Karachi timezone with clear formatting
5. WHEN a listing quantity reaches zero, THE SaveFood_Frontend SHALL hide the listing from the public feed
6. THE SaveFood_Frontend SHALL refresh the public feed at least every 60 seconds
7. THE SaveFood_Frontend SHALL display prices in PKR currency format

### Requirement 3: Organizations Feed

**User Story:** As an organization representative, I want to view free and subsidized food available to shelters and orphanages, so that I can feed people in need

#### Acceptance Criteria

1. WHEN the user role is `org`, THE SaveFood_Frontend SHALL fetch listings from `GET /listings?role=org`
2. THE SaveFood_Frontend SHALL display each listing with title, vendor name, donor name (if sponsored or donated), quantity available, organization price, pickup location, expiry time, and image
3. WHEN a listing has `sponsor_pct=100`, THE SaveFood_Frontend SHALL display the price as "Free"
4. WHEN a listing source is `donated`, THE SaveFood_Frontend SHALL display the prepared time
5. THE SaveFood_Frontend SHALL highlight listings expiring within 2 hours with visual urgency indicators
6. THE SaveFood_Frontend SHALL refresh the organizations feed at least every 60 seconds

### Requirement 4: Food Reservation for Buyers

**User Story:** As a buyer, I want to reserve food items and receive a pickup code, so that I can collect my food from the vendor

#### Acceptance Criteria

1. WHEN a buyer views a public feed listing, THE SaveFood_Frontend SHALL display a reservation button with quantity selector
2. WHEN a buyer clicks the reservation button, THE SaveFood_Frontend SHALL send `POST /listings/{id}/reserve` with buyer name and quantity
3. WHEN Backend_API returns a pickup code, THE SaveFood_Frontend SHALL display the 6-character pickup code prominently
4. THE SaveFood_Frontend SHALL display pickup instructions including vendor name, location, and expiry time
5. THE SaveFood_Frontend SHALL allow the buyer to copy the pickup code to clipboard
6. THE SaveFood_Frontend SHALL validate that reservation quantity does not exceed available quantity
7. IF reservation quantity exceeds available quantity, THEN THE SaveFood_Frontend SHALL display an error message

### Requirement 5: Food Claiming for Organizations

**User Story:** As an organization representative, I want to claim food listings and receive a pickup code, so that I can collect food for our beneficiaries

#### Acceptance Criteria

1. WHEN an organization views the organizations feed, THE SaveFood_Frontend SHALL display a claim button with quantity selector
2. WHEN an organization clicks the claim button, THE SaveFood_Frontend SHALL send `POST /listings/{id}/reserve` with organization name and quantity
3. WHEN Backend_API returns a pickup code, THE SaveFood_Frontend SHALL display the pickup code with collection instructions
4. THE SaveFood_Frontend SHALL display the amount owed (if not 100% sponsored) in PKR
5. THE SaveFood_Frontend SHALL allow the organization to save or print the pickup code
6. IF the listing is 100% sponsored, THE SaveFood_Frontend SHALL display "No payment required" messaging

### Requirement 6: Vendor Listing Creation

**User Story:** As a vendor, I want to post surplus food with photos and details, so that buyers can purchase it before it expires

#### Acceptance Criteria

1. WHEN the user role is `vendor`, THE SaveFood_Frontend SHALL display a form with fields: vendor_name, title, qty, original_price, current_price, pickup_location, expiry_time, and photo upload
2. THE SaveFood_Frontend SHALL validate that photo files are jpg, png, or webp format
3. THE SaveFood_Frontend SHALL validate that photo file size does not exceed 5 MB
4. WHEN a vendor submits the form, THE SaveFood_Frontend SHALL send `POST /listings` as multipart form data with source set to `restaurant`
5. THE SaveFood_Frontend SHALL validate that current_price is less than or equal to original_price
6. THE SaveFood_Frontend SHALL validate that expiry_time is in the future
7. IF Backend_API returns success, THEN THE SaveFood_Frontend SHALL display a confirmation message with listing details
8. IF photo validation fails, THEN THE SaveFood_Frontend SHALL display an error message specifying the validation failure reason

### Requirement 7: Donor Sponsored Listing Creation

**User Story:** As a donor, I want to sponsor restaurant food at a percentage I choose, so that organizations can access it at reduced or no cost

#### Acceptance Criteria

1. WHEN the user role is `donor`, THE SaveFood_Frontend SHALL display a form with fields: donor_name, vendor_name, title, qty, original_price, sponsor_pct (1-100), pickup_location, expiry_time, and photo upload
2. THE SaveFood_Frontend SHALL validate that sponsor_pct is between 1 and 100 inclusive
3. WHEN a donor submits the form, THE SaveFood_Frontend SHALL send `POST /listings` as multipart form data with source set to `sponsored`
4. THE SaveFood_Frontend SHALL calculate and display org_price as `original_price × (100 - sponsor_pct) / 100`
5. WHEN sponsor_pct is 100, THE SaveFood_Frontend SHALL display "Organizations will receive this for free"
6. THE SaveFood_Frontend SHALL validate photo format and size constraints identical to vendor listings

### Requirement 8: Donor Food Donation

**User Story:** As a donor, I want to donate my own fresh food with preparation time details, so that organizations can safely consume it

#### Acceptance Criteria

1. WHEN the user role is `donor`, THE SaveFood_Frontend SHALL provide an option to donate own food
2. THE SaveFood_Frontend SHALL display a form with fields: donor_name, title, qty, pickup_location, prepared_at, expiry_time, dietary_notes (optional), and photo upload
3. THE SaveFood_Frontend SHALL validate that prepared_at is in the past but within 24 hours
4. THE SaveFood_Frontend SHALL validate that expiry_time is after prepared_at
5. WHEN a donor submits the donation form, THE SaveFood_Frontend SHALL send `POST /listings` with source set to `donated`, sponsor_pct set to 100, and org_price set to 0
6. THE SaveFood_Frontend SHALL display a confirmation showing the donation will be available to organizations for free

### Requirement 9: Sponsor Existing Listing

**User Story:** As a donor, I want to sponsor units from an existing restaurant listing, so that I can move specific quantities to the organizations feed

#### Acceptance Criteria

1. WHEN viewing the public feed as a donor, THE SaveFood_Frontend SHALL display a "Sponsor" button on each listing
2. WHEN a donor clicks the sponsor button, THE SaveFood_Frontend SHALL display a form with fields: donor_name, quantity to sponsor, and sponsor_pct (1-100)
3. THE SaveFood_Frontend SHALL validate that sponsor quantity does not exceed available listing quantity
4. WHEN a donor submits the sponsor form, THE SaveFood_Frontend SHALL send `POST /listings/{id}/sponsor` with donor_name, units, and sponsor_pct
5. THE SaveFood_Frontend SHALL calculate and display the total cost as `units × original_price × sponsor_pct / 100` in PKR
6. IF Backend_API returns success, THEN THE SaveFood_Frontend SHALL display confirmation that the sponsored units moved to the organizations feed

### Requirement 10: Vendor Pickup Confirmation

**User Story:** As a vendor, I want to enter pickup codes to mark food as collected, so that I can track which reservations were fulfilled

#### Acceptance Criteria

1. WHEN the user role is `vendor`, THE SaveFood_Frontend SHALL display a pickup code entry interface
2. THE SaveFood_Frontend SHALL validate that the pickup code is exactly 6 characters
3. WHEN a vendor submits a pickup code, THE SaveFood_Frontend SHALL send `POST /listings/{id}/pickup` with the pickup_code
4. IF Backend_API returns success, THEN THE SaveFood_Frontend SHALL display confirmation that the food was marked as collected
5. IF the pickup code is invalid, THEN THE SaveFood_Frontend SHALL display an error message
6. THE SaveFood_Frontend SHALL allow vendors to view their active listings with pending pickup codes

### Requirement 11: Organization Management

**User Story:** As a platform administrator, I want to register shelters and orphanages, so that organizations can be identified in the system

#### Acceptance Criteria

1. THE SaveFood_Frontend SHALL provide an organization registration form with fields: name, type (`shelter` or `orphanage`), area, daily_need, and dietary_notes (optional)
2. WHEN the form is submitted, THE SaveFood_Frontend SHALL send `POST /organizations` with the form data
3. THE SaveFood_Frontend SHALL fetch and display registered organizations from `GET /organizations`
4. THE SaveFood_Frontend SHALL display organization details including name, type, area, and daily need
5. WHEN viewing organizations, THE SaveFood_Frontend SHALL group listings by type (shelter vs orphanage)

### Requirement 12: Donor Impact View

**User Story:** As a donor, I want to see the impact of my contributions, so that I can understand how my donations helped people

#### Acceptance Criteria

1. WHEN the user role is `donor`, THE SaveFood_Frontend SHALL display an impact view option
2. WHEN a donor enters their name, THE SaveFood_Frontend SHALL fetch impact data from `GET /donors/{name}/impact`
3. THE SaveFood_Frontend SHALL display total food units collected, total PKR value of contributions, and number of organizations served
4. THE SaveFood_Frontend SHALL display a breakdown of collected listings by vendor name and organization that claimed the food
5. THE SaveFood_Frontend SHALL display only food marked as collected, not just reserved or claimed

### Requirement 13: AI Chatbot Text Interface

**User Story:** As a user, I want to ask the AI chatbot questions about available food, so that I can find what I need through natural conversation

#### Acceptance Criteria

1. THE SaveFood_Frontend SHALL display a chat interface with message history and input field
2. WHEN a user sends a message, THE SaveFood_Frontend SHALL send `POST /chat` with the user's role and full message history
3. THE SaveFood_Frontend SHALL handle Server-Sent Events (SSE) from Backend_API
4. WHEN Backend_API sends an SSE event with type `listings`, THE SaveFood_Frontend SHALL render listing cards with images
5. WHEN Backend_API sends SSE events with type `token`, THE SaveFood_Frontend SHALL append each token to the chat response in real-time
6. WHEN Backend_API sends an SSE event with type `done`, THE SaveFood_Frontend SHALL mark the response as complete
7. THE SaveFood_Frontend SHALL support multilingual input and output in English, Urdu, and Roman Urdu
8. THE SaveFood_Frontend SHALL display listing cards with reserve or claim buttons based on user role

### Requirement 14: AI Chatbot Voice Interface

**User Story:** As a user, I want to speak to the chatbot in my language, so that I can interact hands-free using voice

#### Acceptance Criteria

1. THE SaveFood_Frontend SHALL provide a voice input button in the chat interface
2. WHEN a user clicks the voice button, THE SaveFood_Frontend SHALL request microphone permission
3. WHEN microphone permission is granted, THE SaveFood_Frontend SHALL start Web_Speech_API recognition with language set to `en-US` or `ur-PK`
4. WHEN Web_Speech_API returns transcribed text, THE SaveFood_Frontend SHALL display the text in the chat input field
5. THE SaveFood_Frontend SHALL automatically send the transcribed message to Backend_API via `POST /chat`
6. WHEN Backend_API responds with text tokens, THE SaveFood_Frontend SHALL use Web_Speech_API synthesis to speak the response
7. THE SaveFood_Frontend SHALL display a visual indicator when voice recognition is active
8. IF Web_Speech_API is not supported, THEN THE SaveFood_Frontend SHALL hide the voice button and display a message recommending Chrome or Edge browsers

### Requirement 15: Chatbot Response Rendering

**User Story:** As a user viewing chatbot responses, I want to see food listings with photos alongside text answers, so that I can make informed decisions

#### Acceptance Criteria

1. WHEN Backend_API sends listing data via SSE, THE SaveFood_Frontend SHALL parse the JSON listing objects
2. THE SaveFood_Frontend SHALL render each listing as a card with image, title, vendor name, quantity, price, location, and expiry time
3. WHEN the user role is `buyer`, THE SaveFood_Frontend SHALL display a "Reserve" button on each listing card in chat
4. WHEN the user role is `org`, THE SaveFood_Frontend SHALL display a "Claim" button on each listing card in chat
5. THE SaveFood_Frontend SHALL render listing cards before the text response begins streaming
6. THE SaveFood_Frontend SHALL maintain chat scroll position at the bottom as new tokens arrive

### Requirement 16: Responsive Layout and Accessibility

**User Story:** As a mobile user, I want the interface to work well on my device, so that I can use SaveFood from anywhere

#### Acceptance Criteria

1. THE SaveFood_Frontend SHALL use responsive design that adapts to mobile, tablet, and desktop screen sizes
2. WHEN viewed on mobile devices, THE SaveFood_Frontend SHALL display navigation controls appropriate for touch interaction
3. THE SaveFood_Frontend SHALL maintain readability with minimum font size of 14px on mobile devices
4. THE SaveFood_Frontend SHALL display listing images with appropriate aspect ratios that preserve image quality
5. THE SaveFood_Frontend SHALL ensure all interactive elements have minimum touch target size of 44x44 pixels
6. THE SaveFood_Frontend SHALL provide keyboard navigation for all interactive elements

### Requirement 17: Error Handling and User Feedback

**User Story:** As a user, I want clear feedback when errors occur, so that I understand what went wrong and how to proceed

#### Acceptance Criteria

1. WHEN Backend_API returns an HTTP error status, THE SaveFood_Frontend SHALL display a user-friendly error message
2. WHEN a network request fails, THE SaveFood_Frontend SHALL display a message indicating connection issues
3. WHEN form validation fails, THE SaveFood_Frontend SHALL highlight invalid fields with specific error messages
4. WHEN a listing becomes unavailable during reservation, THE SaveFood_Frontend SHALL display a message that the item was claimed by someone else
5. THE SaveFood_Frontend SHALL display loading indicators during Backend_API requests
6. THE SaveFood_Frontend SHALL timeout requests after 30 seconds and display an appropriate error message
7. IF SSE connection is lost during chat, THEN THE SaveFood_Frontend SHALL display a message and offer to retry

### Requirement 18: Real-Time Feed Updates

**User Story:** As a user viewing food listings, I want to see updated availability, so that I don't waste time on food that's already gone

#### Acceptance Criteria

1. WHILE a user is viewing a feed, THE SaveFood_Frontend SHALL poll `GET /listings` at 60-second intervals
2. WHEN new listings appear in Backend_API responses, THE SaveFood_Frontend SHALL add them to the feed without full page reload
3. WHEN listing quantities decrease in Backend_API responses, THE SaveFood_Frontend SHALL update displayed quantities
4. WHEN a listing becomes fully claimed (quantity reaches zero), THE SaveFood_Frontend SHALL remove it from the displayed feed
5. THE SaveFood_Frontend SHALL display a timestamp showing when the feed was last updated
6. THE SaveFood_Frontend SHALL provide a manual refresh button to update the feed immediately

### Requirement 19: Time Display and Expiry Warnings

**User Story:** As a user, I want to see clear time information about food expiry, so that I can prioritize urgent pickups

#### Acceptance Criteria

1. THE SaveFood_Frontend SHALL display all times in Asia/Karachi timezone
2. THE SaveFood_Frontend SHALL calculate and display time remaining until expiry (e.g., "Expires in 2 hours")
3. WHEN a listing expires in less than 2 hours, THE SaveFood_Frontend SHALL display the expiry time in red color
4. WHEN a listing expires in less than 30 minutes, THE SaveFood_Frontend SHALL add a pulsing animation to the expiry warning
5. THE SaveFood_Frontend SHALL update displayed time-remaining values at least every minute
6. THE SaveFood_Frontend SHALL display absolute expiry time in 24-hour format (e.g., "20:00")

### Requirement 20: Browser Compatibility and Performance

**User Story:** As a user with a standard web browser, I want the application to load quickly and work smoothly, so that I can access food listings efficiently

#### Acceptance Criteria

1. THE SaveFood_Frontend SHALL load the initial page within 3 seconds on a 10 Mbps connection
2. THE SaveFood_Frontend SHALL support the latest versions of Chrome, Firefox, Safari, and Edge browsers
3. THE SaveFood_Frontend SHALL display a warning message when voice features are accessed in unsupported browsers
4. THE SaveFood_Frontend SHALL optimize images to reduce page load time while maintaining visual quality
5. THE SaveFood_Frontend SHALL lazy-load listing images as they enter the viewport
6. THE SaveFood_Frontend SHALL cache static assets using browser caching mechanisms
7. THE SaveFood_Frontend SHALL compress API responses using gzip or brotli compression

