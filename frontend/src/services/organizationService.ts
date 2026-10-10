import { apiClient } from './api';
import type { Organization } from '../types';

export const organizationService = {
  getOrganizations: (): Promise<Organization[]> => apiClient.get('/organizations'),
  registerOrganization: (data: Omit<Organization, 'id'>): Promise<Organization> => apiClient.post('/organizations', data),
};
