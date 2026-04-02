import { useAuthStore } from '../store/auth';

export async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Important for cookies
  };

  let response = await fetch(url, fetchOptions);

  // Automatic Token Refresh
  if (response.status === 401 && !url.includes('/api/refresh') && !url.includes('/api/login')) {
    const refreshResponse = await fetch('/api/refresh', { method: 'POST', credentials: 'include' });
    
    if (refreshResponse.ok) {
      // Retry original request
      response = await fetch(url, fetchOptions);
    } else {
      // Refresh failed, logout
      // useAuthStore.getState().logout();
    }
  }

  return response;
}
