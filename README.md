# Umika Sushi Frontend

Next.js 15 customer and admin frontend for Umika Sushi.

## Stack

- Next.js 15 app router
- React 19
- TypeScript
- Tailwind CSS
- Shadcn/UI-compatible component structure
- Lucide icons

## Scripts

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

The local dev server runs at `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local` when the backend API is ready:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:2026/api
NEXT_PUBLIC_ORDER_NOTIFICATION_WS_PREFIX=/api/v1
NEXT_PUBLIC_SITE_URL=https://umikasushi.ca
```

For local development, `next.config.ts` proxies `/api/v1/*` to `http://localhost:2026/api/v1/*`.
The manager order notification socket therefore connects through the Next dev server at
`ws://localhost:3000/api/v1/manager/order-notifications/ws`.

`NEXT_PUBLIC_ORDER_NOTIFICATION_WS_URL` can still be set later as an explicit public WebSocket URL.
If it is not set, the frontend falls back to `NEXT_PUBLIC_ORDER_NOTIFICATION_WS_PREFIX`, producing a same-origin URL like
`wss://umikasushi.ca/api/v1/manager/order-notifications/ws` in production. Port `2026` does not need to be public.

Example Nginx proxy for the Spring Boot WebSocket endpoint:

```nginx
map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}

# Put this before the general Next.js location.
location /api/v1/manager/order-notifications/ws {
  proxy_pass http://127.0.0.1:2026/api/v1/manager/order-notifications/ws;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection $connection_upgrade;
  proxy_read_timeout 3600s;
  proxy_send_timeout 3600s;
}

location /api/v1/ {
  proxy_pass http://127.0.0.1:2026/api/v1/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Current Screens

- `/` customer homepage
- `/menu` menu browsing
- `/order` cart and checkout preview
- `/rewards` loyalty and referral overview
- `/account` customer profile preview
- `/login` login form shell
- `/admin` manager dashboard preview
