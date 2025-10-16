const DEFAULT_API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://plumino.onrender.com/api';

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly NG_APP_API_BASE_URL?: string;
    readonly NG_APP_SSE_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface Window {
    __env__?: Record<string, string | undefined>;
  }
}

const metaEnvValues: Partial<Record<keyof ImportMetaEnv, string | undefined>> = {};

try {
  metaEnvValues.NG_APP_API_BASE_URL = import.meta.env.NG_APP_API_BASE_URL;
  metaEnvValues.VITE_API_URL = import.meta.env.VITE_API_URL;
  metaEnvValues.NG_APP_SSE_URL = import.meta.env.NG_APP_SSE_URL;
} catch {
  // ignore failures when import.meta is unavailable (e.g., Jest)
}

const readEnvValue = (key: keyof ImportMetaEnv): string | undefined => {
  try {
    const metaValue = metaEnvValues[key];
    if (typeof metaValue === 'string' && metaValue.trim()) {
      return metaValue.trim();
    }
  } catch {
    // ignore failures when import.meta is unavailable (e.g., Jest)
  }

  if (typeof window !== 'undefined') {
    const windowValue = window.__env__?.[key as string];
    if (typeof windowValue === 'string' && windowValue.trim()) {
      return windowValue.trim();
    }
  }

  return undefined;
};

const normalizeUrl = (value: string): string => value.replace(/\/+$/, '');

const apiBaseCandidate =
  readEnvValue('NG_APP_API_BASE_URL') ??
  readEnvValue('VITE_API_URL') ??
  DEFAULT_API_BASE_URL;
const apiBaseUrl = normalizeUrl(apiBaseCandidate);
const sseCandidate = readEnvValue('NG_APP_SSE_URL') ?? `${apiBaseUrl}/sse/notifications`;
const sseUrl = normalizeUrl(sseCandidate);

export const environment = {
  apiBaseUrl,
  sseUrl
} as const;

export type Environment = typeof environment;
