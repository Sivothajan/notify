'use client';

import { useCallback, useEffect, useRef } from 'react';

const NOTIFY_NAVIGATION_EVENT = 'notify:navigation';

let historyPatchSubscribers = 0;
let restoreHistoryPatch: (() => void) | null = null;

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `notify_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2)}`;
}

function installHistoryNavigationDispatch(): () => void {
  historyPatchSubscribers += 1;

  if (!restoreHistoryPatch) {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushState(...args): void {
      originalPushState.apply(this, args);
      window.dispatchEvent(new Event(NOTIFY_NAVIGATION_EVENT));
    };

    window.history.replaceState = function replaceState(...args): void {
      originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event(NOTIFY_NAVIGATION_EVENT));
    };

    restoreHistoryPatch = (): void => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }

  return (): void => {
    historyPatchSubscribers -= 1;

    if (historyPatchSubscribers === 0) {
      restoreHistoryPatch?.();
      restoreHistoryPatch = null;
    }
  };
}

/**
 * Represents device and environment information collected from the client.
 */
export interface DeviceInfo {
  /** Browser user agent string */
  userAgent: string;

  /** Operating system platform */
  platform: string;

  /** Physical screen width in pixels */
  screenWidth: number;

  /** Physical screen height in pixels */
  screenHeight: number;

  /** Viewport width in pixels */
  viewportWidth: number;

  /** Viewport height in pixels */
  viewportHeight: number;

  /** Device pixel ratio (DPR) */
  devicePixelRatio: number;

  /** Screen color depth */
  colorDepth: number;

  /** Screen orientation (portrait/landscape) */
  orientation: string;

  /** Whether touch input is supported */
  touchEnabled: boolean;

  /** Browser language */
  language: string;

  /** Online/offline status */
  onlineStatus: boolean;

  /** Approximate device memory in GB (may be undefined) */
  memory?: number | null;

  /** Current ISO timestamp */
  timestamp: string;

  /** Browser timezone */
  timezone: string;

  /** Referrer URL */
  referrer: string;
}

/**
 * Props for the Notify component.
 */
export interface NotifyProps {
  /**
   * API endpoint URL where notifications will be sent.
   *
   * Example:
   * `/api/notify`
   */
  apiEndPoint: string;

  /**
   * Enable console logging for debugging.
   *
   * @default false
   */
  consoleLog?: boolean;

  /**
   * Maximum retry attempts if request fails.
   *
   * @default 3
   */
  maxRetries?: number;

  /**
   * Initial retry delay in milliseconds.
   * Uses exponential backoff.
   *
   * @default 1000
   */
  retryDelay?: number;
}

/**
 * Notify Component
 *
 * Sends page visit and navigation events to a server endpoint.
 *
 * Features:
 * - Device info collection
 * - Retry with exponential backoff
 * - SPA navigation detection
 * - Cleanup on unmount
 * - Safe for React 18 and Next.js
 *
 * This component renders nothing.
 *
 * @example
 * ```tsx
 * <Notify apiEndPoint="/api/notify" consoleLog />
 * ```
 *
 * @returns null
 */
export default function Notify({
  apiEndPoint,
  consoleLog = false,
  maxRetries = 3,
  retryDelay = 1000,
}: NotifyProps): null {
  /**
   * Tracks whether component is mounted to prevent memory leaks.
   */
  const isMountedRef = useRef<boolean>(true);

  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Generates a session ID that persists during component lifecycle.
   */
  const sessionIdRef = useRef<string>(createSessionId());

  /**
   * Collects device and environment information.
   *
   * @returns {DeviceInfo} Device information object
   */
  const getDeviceInfo = useCallback((): DeviceInfo => {
    return {
      userAgent: navigator.userAgent,

      platform:
        navigator.platform || (navigator.userAgentData?.platform ?? 'Unknown'),

      screenWidth: window.screen.width,

      screenHeight: window.screen.height,

      viewportWidth: document.documentElement.clientWidth,

      viewportHeight: document.documentElement.clientHeight,

      devicePixelRatio: window.devicePixelRatio,

      colorDepth: window.screen.colorDepth,

      orientation:
        window.screen.orientation?.type ||
        (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'),

      touchEnabled: 'ontouchstart' in window || navigator.maxTouchPoints > 0,

      language: navigator.language,

      onlineStatus: navigator.onLine,

      memory: navigator.deviceMemory ?? null,

      timestamp: new Date().toISOString(),

      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

      referrer: document.referrer || 'direct',
    };
  }, []);

  /**
   * Sends notification to server with retry logic.
   *
   * Uses exponential backoff strategy.
   *
   * @param retryCount - Current retry attempt
   */
  const notifyServer = useCallback(
    async (retryCount: number = 0): Promise<void> => {
      if (!apiEndPoint || !isMountedRef.current) return;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(apiEndPoint, {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          signal: controller.signal,

          body: JSON.stringify({
            sessionId: sessionIdRef.current,

            currentPageUrl: window.location.href,

            deviceInfo: getDeviceInfo(),
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        if (consoleLog) {
          // eslint-disable-next-line no-console
          console.log('[Notify] Success:', {
            url: window.location.href,
            sessionId: sessionIdRef.current,
          });
        }
      } catch (error) {
        if (!isMountedRef.current) return;

        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        if (retryCount >= maxRetries) {
          if (consoleLog) {
            // eslint-disable-next-line no-console
            console.error('[Notify] Failed after max retries:', error);
          }
          return;
        }

        const delay = retryDelay * Math.pow(2, retryCount);

        if (consoleLog) {
          // eslint-disable-next-line no-console
          console.warn(`[Notify] Retry ${retryCount + 1} in ${delay}ms`);
        }

        retryTimeoutRef.current = setTimeout(() => {
          notifyServer(retryCount + 1);
        }, delay);
      }
    },
    [apiEndPoint, consoleLog, getDeviceInfo, maxRetries, retryDelay]
  );

  /**
   * Sets up navigation listeners and sends initial notification.
   */
  useEffect(() => {
    isMountedRef.current = true;

    /**
     * Handles navigation events.
     */
    const handleNavigation = (): void => {
      notifyServer();
    };

    // Initial page visit
    notifyServer();

    // Listen for navigation events
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener(NOTIFY_NAVIGATION_EVENT, handleNavigation);

    const uninstallHistoryNavigationDispatch =
      installHistoryNavigationDispatch();

    return (): void => {
      isMountedRef.current = false;

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      abortControllerRef.current?.abort();

      window.removeEventListener('popstate', handleNavigation);

      window.removeEventListener('hashchange', handleNavigation);

      window.removeEventListener(NOTIFY_NAVIGATION_EVENT, handleNavigation);

      uninstallHistoryNavigationDispatch();
    };
  }, [notifyServer]);

  return null;
}
