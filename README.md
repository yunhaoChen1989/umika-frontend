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
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
NEXT_PUBLIC_SITE_URL=https://umikasushi.ca
```

## Current Screens

- `/` customer homepage
- `/menu` menu browsing
- `/order` cart and checkout preview
- `/rewards` loyalty and referral overview
- `/account` customer profile preview
- `/login` login form shell
- `/admin` manager dashboard preview
