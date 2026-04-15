# Marketplace CUZ (Expo)

Marketplace CUZ is an Expo mobile app concept for student entrepreneurship on campus.

## What this version improves

- Modular codebase (auth, dashboard, shared card component, utils, and typed models).
- Enforces **student Gmail-only** sign-in plus required student ID.
- Explicit **buyer/seller** account mode.
- Seller-only listing creation.
- Buyer-only ordering flow with initial `pending-clarification` status.
- Seller and buyer order views with **confirm** and **refund** actions.
- Uber handoff via deep-link (`uber://`) with browser fallback.

## Project structure

- `App.tsx` - root app flow and screen switching
- `src/screens/AuthScreen.tsx` - login and role selection
- `src/screens/DashboardScreen.tsx` - listings, orders, dashboard stats
- `src/components/Card.tsx` - reusable UI container
- `src/utils/auth.ts` - email and student ID validation
- `src/data/mock.ts` - seed listings
- `src/types.ts` - app data types

## Run

```bash
npm install
npm run start
```
