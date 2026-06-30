import type { HaigeApi } from './app';

declare global {
  interface Window {
    haige?: HaigeApi;
  }
}

export {};
