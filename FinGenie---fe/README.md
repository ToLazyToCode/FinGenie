# FinGenie – Mobile Frontend

Production-ready mobile-first React Native (Expo) app for FinGenie.

## Tech Stack

- **Expo** + React Native
- **TypeScript**
- **React Navigation** (stack + bottom tabs)
- **TanStack Query** (data fetching)
- **Zustand** (state)
- **Axios** (API client)
- **expo-linear-gradient** (gradients)

## Project Structure

```
src/
├── api/           # API client, interceptors, modules
├── components/    # Reusable UI (Card, GradientButton, etc.)
├── features/      # Feature-specific logic (future)
├── hooks/         # Custom hooks
├── navigation/    # Navigation config
├── screens/       # Screen components
├── store/         # Zustand stores
├── theme/         # Design tokens
└── utils/         # Utilities
```

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: set EXPO_PUBLIC_API_URL to your backend URL
```

## Run

```bash
npm start
# Then: press a for Android, i for iOS, or scan QR with Expo Go
```

## Backend

Expects Spring Boot backend at `http://localhost:8080` (or `EXPO_PUBLIC_API_URL`).

API prefix: `/api/v1`

## Design

- Fintech + AI Companion + Soft Gamification
- Purple gradient accents (#6B4EFF)
- Rounded cards, clean white background
- Friendly but premium

## Navigation

Bottom tabs: Home | Wallets | AI | Friends | Profile
