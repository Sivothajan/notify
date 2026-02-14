export {};

declare global {
  interface Navigator {
    /** Experimental: Device Memory API */
    deviceMemory?: number;

    /** Experimental: User-Agent Client Hints API */
    userAgentData?: {
      brands?: {
        brand: string;
        version: string;
      }[];
      mobile?: boolean;
      platform?: string;
    };
  }
}
