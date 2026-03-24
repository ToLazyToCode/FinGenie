/**
 * URL polyfill for React Native
 * Re-exports from react-native-url-polyfill
 */

import 'react-native-url-polyfill/auto';

// Re-export URL and URLSearchParams from the global scope
export const URL = globalThis.URL;
export const URLSearchParams = globalThis.URLSearchParams;

// Polyfill for Node's url.parse
export function parse(urlString, parseQueryString = false, slashesDenoteHost = false) {
  try {
    const url = new URL(urlString);
    return {
      protocol: url.protocol,
      slashes: url.protocol.includes(':'),
      auth: url.username ? `${url.username}:${url.password}` : null,
      host: url.host,
      port: url.port || null,
      hostname: url.hostname,
      hash: url.hash || null,
      search: url.search || null,
      query: parseQueryString ? Object.fromEntries(url.searchParams) : url.search?.slice(1) || null,
      pathname: url.pathname,
      path: url.pathname + (url.search || ''),
      href: url.href,
    };
  } catch {
    return {};
  }
}

// Polyfill for Node's url.format
export function format(urlObject) {
  if (typeof urlObject === 'string') return urlObject;
  
  const { protocol = '', hostname = '', port, pathname = '', search = '', hash = '' } = urlObject;
  const portStr = port ? `:${port}` : '';
  return `${protocol}//${hostname}${portStr}${pathname}${search}${hash}`;
}

// Polyfill for Node's url.resolve
export function resolve(from, to) {
  try {
    return new URL(to, from).href;
  } catch {
    return to;
  }
}

export default {
  URL,
  URLSearchParams,
  parse,
  format,
  resolve,
};
