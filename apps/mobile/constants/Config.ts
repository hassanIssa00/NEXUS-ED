import { Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_NEXUS_API_URL?.trim();
const productionApiUrl = 'https://nexus-edu-api.vercel.app/api';

function normalizeApiUrl(value: string) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The API URL must not contain credentials, a query, or a fragment.');
  }

  const localHost = /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|\[?::1\]?|.*\.local)$/i;
  if (!__DEV__ && (url.protocol !== 'https:' || localHost.test(url.hostname))) {
    throw new Error('Production builds require a public HTTPS Nexus API URL.');
  }

  url.pathname = `${url.pathname.replace(/\/+$/, '')}`;
  if (!url.pathname.endsWith('/api')) url.pathname = `${url.pathname}/api`;
  return url.toString().replace(/\/$/, '');
}

let apiUrl: string | null = null;
let apiConfigError: string | null = null;

try {
  apiUrl = normalizeApiUrl(
    configuredApiUrl ?? (__DEV__ && Platform.OS === 'android' ? 'http://10.0.2.2:4000/api' : productionApiUrl),
  );
} catch (error) {
  apiConfigError = error instanceof Error ? error.message : 'Invalid Nexus API URL.';
}

export const API_URL = apiUrl;
export const API_CONFIG_ERROR = apiConfigError;

export const BRAND = {
  ink: '#14233B',
  muted: '#64758B',
  line: '#E3EAF0',
  canvas: '#F5F8FA',
  paper: '#FFFFFF',
  teal: '#008A78',
  tealSoft: '#E2F6F1',
  blue: '#2863E8',
  blueSoft: '#EAF1FF',
  amber: '#B96808',
  amberSoft: '#FFF3DA',
  red: '#B42318',
};
