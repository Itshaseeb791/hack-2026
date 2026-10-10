import { apiClient } from './api';
import { Role, Listing, ReservationRequest, SponsorRequest } from '../types';

export const listingService = {
  getListings: (role: Role) => apiClient.get(`/listings?role=${role}`),
  
  createListing: (data: FormData) => 
    apiClient.post('/listings', data, { headers: {} }),
  
  reserveListing: (id: string, data: ReservationRequest) => 
    apiClient.post(`/listings/${id}/reserve`, data),
  
  sponsorListing: (id: string, data: SponsorRequest) => 
    apiClient.post(`/listings/${id}/sponsor`, data),
  
  confirmPickup: (id: string, code: string) => 
    apiClient.post(`/listings/${id}/pickup`, { pickup_code: code }),
};
