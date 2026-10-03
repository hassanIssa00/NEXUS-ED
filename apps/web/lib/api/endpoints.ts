const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

export function getApiBaseUrl(): string | null {
  if (configuredApiUrl) {
    if (process.env.NODE_ENV === 'production') {
      if (/localhost|127\.0\.0\.1/i.test(configuredApiUrl)) return null;
      try {
        if (new URL(configuredApiUrl).protocol !== 'https:') return null;
      } catch {
        if (!configuredApiUrl.startsWith('/')) return null;
      }
    }
    return configuredApiUrl;
  }

  return process.env.NODE_ENV === 'production' ? null : 'http://localhost:4000/api';
}

export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error('The Nexus API endpoint is not configured for this deployment.');
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getSocketBaseUrl(): string | null {
  const configuredSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim().replace(/\/+$/, '');
  if (configuredSocketUrl) {
    if (process.env.NODE_ENV === 'production') {
      if (/localhost|127\.0\.0\.1/i.test(configuredSocketUrl)) return null;
      try {
        if (new URL(configuredSocketUrl).protocol !== 'https:') return null;
      } catch {
        if (!configuredSocketUrl.startsWith('/')) return null;
      }
    }
    return configuredSocketUrl;
  }

  const apiBaseUrl = getApiBaseUrl();
  return apiBaseUrl?.replace(/\/api\/?$/, '') ?? null;
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('access_token')
    || localStorage.getItem('access_token')
    || localStorage.getItem('token');
}
