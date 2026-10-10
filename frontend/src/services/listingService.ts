import { apiClient } from './api';
import type { Listing, ReservationRequest, ReservationResponse, SponsorRequest } from '../types';

export const listingService = {
  getListings: (role: 'buyer' | 'org'): Promise<Listing[]> => apiClient.get(`/listings?role=${role}`),

  createListing: (data: FormData): Promise<Listing> =>
    apiClient.post('/listings', data, { headers: {} }),

  reserveListing: (id: number, data: ReservationRequest): Promise<ReservationResponse> =>
    apiClient.post(`/listings/${id}/reserve`, data),

  sponsorListing: (id: number, data: SponsorRequest): Promise<Listing> =>
    apiClient.post(`/listings/${id}/sponsor`, data),
  
  confirmPickup: (code: string) =>
    apiClient.post('/reservations/pickup', { pickup_code: code }),
};
