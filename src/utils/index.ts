import type { Request } from 'express';
import { UAParser } from 'ua-parser-js';

/**
 * Device information sent from frontend
 */
export interface ClientDeviceInfo {
  userAgent?: string;
  platform?: string;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  devicePixelRatio?: number;
  colorDepth?: number;
  orientation?: string;
  touchEnabled?: boolean;
  language?: string;
  onlineStatus?: boolean;
  memory?: number | null;
  timestamp?: string;
  timezone?: string;
  referrer?: string;
}

/**
 * Parsed device info from user agent
 */
export interface ParsedUserAgent {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: string;
  deviceVendor: string;
  deviceModel: string;
}

/**
 * Full analytics record
 */
export interface AnalyticsRecord {
  ip: string;
  url: string;
  timestamp: string;
  device: ClientDeviceInfo;
  userAgent: ParsedUserAgent;
}

/**
 * Extract client IP address safely
 *
 * Supports:
 * - Cloudflare
 * - Nginx
 * - proxies
 * - direct connections
 *
 * @param req Express request
 * @returns client IP
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  if (req.headers['cf-connecting-ip']) {
    return String(req.headers['cf-connecting-ip']);
  }

  if (req.headers['x-real-ip']) {
    return String(req.headers['x-real-ip']);
  }

  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

  return 'Unknown';
}

/**
 * Parse user agent string into structured info
 *
 * @param userAgent raw UA string
 */
export function parseUserAgent(userAgent?: string): ParsedUserAgent {
  if (!userAgent) {
    return {
      browser: 'Unknown',
      browserVersion: 'Unknown',
      os: 'Unknown',
      osVersion: 'Unknown',
      deviceType: 'Unknown',
      deviceVendor: 'Unknown',
      deviceModel: 'Unknown',
    };
  }

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    browser: result.browser.name ?? 'Unknown',
    browserVersion: result.browser.version ?? 'Unknown',

    os: result.os.name ?? 'Unknown',
    osVersion: result.os.version ?? 'Unknown',

    deviceType: result.device.type ?? 'desktop',
    deviceVendor: result.device.vendor ?? 'Unknown',
    deviceModel: result.device.model ?? 'Unknown',
  };
}

/**
 * Normalize client device info safely
 *
 * Ensures no undefined values
 */
export function normalizeDeviceInfo(info: unknown): ClientDeviceInfo {
  if (!info || typeof info !== 'object') {
    return {};
  }

  const data = info as Partial<ClientDeviceInfo>;

  return {
    userAgent: data.userAgent ?? 'Unknown',
    platform: data.platform ?? 'Unknown',

    screenWidth: data.screenWidth ?? undefined,
    screenHeight: data.screenHeight ?? undefined,

    viewportWidth: data.viewportWidth ?? undefined,
    viewportHeight: data.viewportHeight ?? undefined,

    devicePixelRatio: data.devicePixelRatio ?? undefined,

    colorDepth: data.colorDepth ?? undefined,

    orientation: data.orientation ?? 'Unknown',

    touchEnabled: data.touchEnabled ?? undefined,

    language: data.language ?? 'Unknown',

    onlineStatus: data.onlineStatus ?? undefined,

    memory: data.memory ?? null,

    timestamp: data.timestamp ?? new Date().toISOString(),

    timezone: data.timezone ?? 'Unknown',

    referrer: data.referrer ?? 'Unknown',
  };
}

/**
 * Build complete analytics record from request
 *
 * @param req Express request
 */
export function buildAnalyticsRecord(req: Request): AnalyticsRecord {
  const ip = getClientIP(req);

  const url = req.body?.currentPageUrl ?? 'Unknown';

  const device = normalizeDeviceInfo(req.body?.deviceInfo);

  const userAgent = parseUserAgent(req.headers['user-agent']);

  return {
    ip,

    url,

    timestamp: new Date().toISOString(),

    device,

    userAgent,
  };
}

/**
 * Format analytics record into readable text
 *
 * Useful for notifications, logging, emails
 */
export function formatAnalyticsRecord(record: AnalyticsRecord): string {
  return `
IP: ${record.ip}

URL: ${record.url}

Time: ${record.timestamp}

Browser: ${record.userAgent.browser} ${record.userAgent.browserVersion}

OS: ${record.userAgent.os} ${record.userAgent.osVersion}

Device: ${record.userAgent.deviceVendor} ${record.userAgent.deviceModel}

Screen: ${record.device.screenWidth}x${record.device.screenHeight}

Viewport: ${record.device.viewportWidth}x${record.device.viewportHeight}

Language: ${record.device.language}

Timezone: ${record.device.timezone}

Referrer: ${record.device.referrer}
`;
}
