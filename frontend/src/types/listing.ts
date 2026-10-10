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
  current_price?: number;
  org_price?: number;
  sponsor_pct?: number;
  pickup_location: string;
  expiry_time: string;
  prepared_at?: string;
  dietary_notes?: string;
  image_url: string;
  audience: 'public' | 'orgs_only';
  created_at: string;
  status?: string;
  claimed_by?: string;
  pickup_code?: string;
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
