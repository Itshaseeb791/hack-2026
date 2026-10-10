import { apiClient } from './api';

export const organizationService = {
  getOrganizations: () => apiClient.get('/organizations'),
  registerOrganization: (data: any) => apiClient.post('/organizations', data),
};
