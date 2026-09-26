import { NativeModules } from 'react-native';

type BaseUrlConfig = {
  runtimeBaseUrl?: string;
  buildTimeBaseUrl?: string;
};

function validUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? value.replace(/\/$/, '')
      : undefined;
  } catch {
    return undefined;
  }
}

export function resolveApiBaseUrl(config: BaseUrlConfig): string {
  const value =
    validUrl(config.runtimeBaseUrl) ?? validUrl(config.buildTimeBaseUrl);
  if (!value) throw new Error('CIVICOS_API_BASE_URL_REQUIRED');
  return value;
}

export function apiBaseUrl(): string {
  const globals = globalThis as typeof globalThis & {
    __CIVICOS_API_BASE_URL__?: string;
    __CIVICOS_BUILD_API_BASE_URL__?: string;
  };
  const native = NativeModules.CivicOSApiConfig as
    { CIVICOS_API_BASE_URL?: string } | undefined;
  return resolveApiBaseUrl({
    runtimeBaseUrl: globals.__CIVICOS_API_BASE_URL__,
    buildTimeBaseUrl:
      globals.__CIVICOS_BUILD_API_BASE_URL__ ?? native?.CIVICOS_API_BASE_URL,
  });
}
