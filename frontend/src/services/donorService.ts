import { apiClient } from './api';
import type { ImpactData } from '../types';

export const donorService = {
  getImpact: (name: string): Promise<ImpactData> =>
    apiClient.get(`/donors/${encodeURIComponent(name)}/impact`),
};
