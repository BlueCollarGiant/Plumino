const FALLBACK_API_BASE_URL = 'http://localhost:5000/api';

declare global {
  interface ImportMetaEnv {
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

const readEnvValue = (key: keyof ImportMetaEnv): string | undefined => {
  try {
    const metaValue = import.meta.env?.[key];
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

const apiBaseCandidate = readEnvValue('NG_APP_API_BASE_URL') ?? FALLBACK_API_BASE_URL;
const apiBaseUrl = normalizeUrl(apiBaseCandidate);
const sseCandidate = readEnvValue('NG_APP_SSE_URL') ?? `${apiBaseUrl}/sse/notifications`;
const sseUrl = normalizeUrl(sseCandidate);

export const environment = {
  apiBaseUrl,
  sseUrl
} as const;

export type Environment = typeof environment;

