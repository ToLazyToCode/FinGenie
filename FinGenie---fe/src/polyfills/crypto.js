/**
 * Crypto polyfill for React Native
 * 
 * Provides minimal crypto functionality needed by axios and other packages
 * that try to import Node.js's crypto module.
 */

import * as ExpoCrypto from 'expo-crypto';

// Polyfill for randomBytes (used by axios for request IDs)
export function randomBytes(size) {
  const bytes = ExpoCrypto.getRandomBytes(size);
  return {
    toString: (encoding) => {
      if (encoding === 'hex') {
        return Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }
      return String.fromCharCode(...bytes);
    },
  };
}

// Polyfill for randomUUID
export function randomUUID() {
  return ExpoCrypto.randomUUID();
}

// Create hash stub (not commonly needed by axios)
export function createHash(algorithm) {
  return {
    update: () => ({ digest: () => '' }),
  };
}

// Create hmac stub
export function createHmac(algorithm, key) {
  return {
    update: () => ({ digest: () => '' }),
  };
}

export default {
  randomBytes,
  randomUUID,
  createHash,
  createHmac,
};
