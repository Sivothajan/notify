# @sivothajan/notify

A lightweight React analytics and notification component with backend utilities for safely collecting device information, user agent details, and client IP addresses.

Designed for analytics, logging, monitoring, and security use cases. Works with React, Next.js, and Express.

---

## Installation

```bash
npm install @sivothajan/notify
```

or

```bash
bun add @sivothajan/notify
```

---

## Features

- Automatic page visit tracking
- SPA navigation tracking
- Comprehensive device information collection
- Safe client IP detection (Cloudflare, proxies, and load balancers supported)
- User agent parsing (browser, OS, and device detection)
- Retry logic with exponential backoff
- Lightweight and fast
- Full TypeScript support
- Includes frontend and backend utilities

---

## Usage

```tsx
import { Notify } from '@sivothajan/notify';

export default function App() {
  return (
    <>
      <Notify apiEndPoint="/api/notify" />
    </>
  );
}
```

---

## Props

| Prop        | Type    | Default  | Description                            |
| ----------- | ------- | -------- | -------------------------------------- |
| apiEndPoint | string  | required | Server endpoint to send analytics data |
| consoleLog  | boolean | false    | Enable console logging                 |
| maxRetries  | number  | 3        | Maximum retry attempts                 |
| retryDelay  | number  | 1000     | Base retry delay in milliseconds       |

---

## Server Payload

The component sends the following payload:

```ts
{
  sessionId: string;
  currentPageUrl: string;
  deviceInfo: DeviceInfo;
}
```

---

## DeviceInfo Structure

```ts
interface DeviceInfo {
  userAgent: string;
  platform: string;

  screenWidth: number;
  screenHeight: number;

  viewportWidth: number;
  viewportHeight: number;

  devicePixelRatio: number;
  colorDepth: number;

  orientation: string;
  touchEnabled: boolean;

  language: string;
  onlineStatus: boolean;

  memory?: number | null;

  timestamp: string;
  timezone: string;

  referrer: string;
}
```

---

## Backend Utilities

This package includes backend helpers for Express and other Node.js servers.

---

### buildAnalyticsRecord

Creates a complete analytics record from an Express request.

```ts
import { buildAnalyticsRecord } from '@sivothajan/notify';

app.post('/api/notify', (req, res) => {
  const record = buildAnalyticsRecord(req);

  console.log(record);

  res.sendStatus(200);
});
```

---

### AnalyticsRecord Structure

```ts
interface AnalyticsRecord {
  ip: string;
  url: string;
  timestamp: string;

  device: ClientDeviceInfo;

  userAgent: {
    browser: string;
    browserVersion: string;
    os: string;
    osVersion: string;
    deviceType: string;
    deviceVendor: string;
    deviceModel: string;
  };
}
```

---

### getClientIP

Extracts the real client IP address safely.

Supports Cloudflare, proxies, load balancers, and direct connections.

```ts
import { getClientIP } from '@sivothajan/notify';

const ip = getClientIP(req);
```

---

### parseUserAgent

Parses browser, OS, and device information.

```ts
import { parseUserAgent } from '@sivothajan/notify';

const ua = parseUserAgent(req.headers['user-agent']);
```

---

### normalizeDeviceInfo

Normalizes and validates device information from the client.

```ts
import { normalizeDeviceInfo } from '@sivothajan/notify';

const device = normalizeDeviceInfo(req.body.deviceInfo);
```

---

### formatAnalyticsRecord

Formats analytics data for logging or notifications.

```ts
import { formatAnalyticsRecord } from '@sivothajan/notify';

const text = formatAnalyticsRecord(record);
```

---

## Exported API

```ts
import {
  Notify,
  buildAnalyticsRecord,
  getClientIP,
  parseUserAgent,
  normalizeDeviceInfo,
  formatAnalyticsRecord,
  type NotifyProps,
  type AnalyticsRecord,
  type ClientDeviceInfo,
  type ParsedUserAgent,
} from '@sivothajan/notify';
```

---

## Browser Support

Supports all modern browsers including Chrome, Firefox, Safari, Edge, and mobile browsers.

---

## Requirements

Frontend:

- React 18 or newer

Backend:

- Node.js 18 or newer
- Express recommended

---

## Use Cases

- Website analytics
- Login alerts
- Security monitoring
- Audit logging
- Admin dashboards
- Visitor tracking

---

## License

MIT © Sivothayan
