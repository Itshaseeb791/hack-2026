const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const TIMEOUT = 30000;

async function parseError(response: Response): Promise<Error> {
  let detail = response.statusText || `HTTP ${response.status}`;
  try {
    const body = await response.json();
    if (body?.detail) {
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    }
  } catch {
    // Response body wasn't JSON (or was empty) — fall back to statusText/status.
  }
  return new Error(detail);
}

function toFriendlyError(err: unknown): Error {
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return new Error('Request timed out — check your connection and try again.');
  }
  if (err instanceof TypeError) {
    return new Error('Could not reach the server — check your connection and try again.');
  }
  return err instanceof Error ? err : new Error(String(err));
}

export const apiClient = {
  get: async (url: string, options?: RequestInit) => {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        signal: AbortSignal.timeout(TIMEOUT),
      });
    } catch (err) {
      throw toFriendlyError(err);
    }
    if (!response.ok) throw await parseError(response);
    return response.json();
  },
  post: async (url: string, data?: unknown, options?: RequestInit) => {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: data instanceof FormData ? data : JSON.stringify(data),
        signal: AbortSignal.timeout(TIMEOUT),
        ...options,
      });
    } catch (err) {
      throw toFriendlyError(err);
    }
    if (!response.ok) throw await parseError(response);
    return response.json();
  },
};
