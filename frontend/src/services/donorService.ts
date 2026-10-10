import { apiClient } from './api';

export const donorService = {
  getImpact: (name: string) => 
    apiClient.get(`/donors/${encodeURIComponent(name)}/impact`),
};
