export type Role = 'buyer' | 'org' | 'vendor' | 'donor';

export type ListingSource = 'restaurant' | 'sponsored' | 'donated';

// Matches the ListingOut shape returned by GET /listings on the backend
// (backend/app/listings.py). The backend sends one unified `price` for the
// caller's role (current_price for buyers, org_price for orgs) — it never
// sends original_price/current_price/org_price here.
export interface Listing {
  id: number;
  source: ListingSource;
  vendor_name: string | null;
  donor_name: string | null;
  title: string;
  description: string | null;
  qty: number;
  price: number;
  is_free: boolean;
  sponsor_pct: number | null;
  image_url: string | null;
  pickup_location: string;
  expiry_time: string;
  minutes_left: number;
  status: string;
}

export interface ReservationRequest {
  role: 'buyer' | 'org';
  qty: number;
  name?: string;   // required when role === 'buyer'
  org_id?: number; // required when role === 'org'
}

export interface ReservationResponse {
  reservation_id: number;
  pickup_code: string;
  qty: number;
  price_per_unit: number;
  total_price: number;
  pickup_location: string;
  expiry_time: string;
}

export interface SponsorRequest {
  donor_name: string;
  qty: number;
  sponsor_pct: number;
}
