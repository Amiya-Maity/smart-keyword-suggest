// Simple centralized logger so all extension logs share a prefix and format
export const LOG_PREFIX = "[smart-keyword-suggest]";

export function info(...args: any[]) {
  console.log(LOG_PREFIX, ...args);
}

export function warn(...args: any[]) {
  console.warn(LOG_PREFIX, ...args);
}

export function error(...args: any[]) {
  console.error(LOG_PREFIX, ...args);
}

export function debug(...args: any[]) {
  // Use console.debug so it can be filtered separately if needed
  console.debug(LOG_PREFIX, ...args);
}
