// Note: axios will be installed later, using fetch for now
const API_BASE_URL = 'http://localhost:8000';
const TIMEOUT = 30000;

export const apiClient = {
  get: async (url: string, options?: any) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  post: async (url: string, data?: any, options?: any) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: data instanceof FormData ? data : JSON.stringify(data),
      signal: AbortSignal.timeout(TIMEOUT),
      ...options,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
};
