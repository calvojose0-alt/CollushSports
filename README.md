# Collush Sports App

A sports fan competition platform. Currently featuring the **F1 Survivor Pool** for the 2025 Formula 1 season.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The app runs at `http://localhost:5173` by default.

## 🎮 Games

| Game | Status |
|------|--------|
| F1 Survivor Pool | ✅ Live |
| NFL Survivor Pool | 🔒 Coming Soon |
| NFL Win-League | 🔒 Coming Soon |
| 2026 World Cup Quiniela | 🔒 Coming Soon |

## 🏎️ F1 Survivor Pool Rules

Each race week, select two drivers:
- **Column A (Podium Pick):** Driver must finish Top 3
- **Column B (Top 10 Pick):** Driver must finish Top 10

**Survival:** Advance if at least one pick succeeds. Both fail → eliminated.
**Points:** Earn +1 point when both picks succeed in the same race.
**Constraint:** Each driver can only be used once per column across the entire season.

## 🔥 Firebase Setup (optional)

The app works in **demo mode** (localStorage) out of the box. To enable real-time multiplayer:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password) and **Firestore**
3. Copy `.env.example` → `.env.local`
4. Fill in your Firebase credentials
5. Set `VITE_APP_MODE=live`

## 📡 OpenF1 API

Race results can be fetched automatically via the [OpenF1 API](https://openf1.org/) (free, no key required). The admin page includes a "Fetch from OpenF1 API" button. When `VITE_APP_MODE=demo`, results must be entered manually.

## 📁 Project Structure

```
src/
├── components/
│   ├── Auth/           Login & Register pages
│   ├── Home/           Main game selection page
│   ├── Layout/         Header, nav
│   └── F1Survivor/
│       ├── PickSubmission/   Race picks + Driver Panel
│       ├── Leaderboard/      Season standings
│       ├── History/          Per-race pick history
│       ├── Groups/           Friend groups with invite codes
│       └── Admin/            Race result ingestion
├── hooks/              useAuth, useF1Game, useF1Data
├── services/
│   ├── firebase/       Auth + Firestore (with demo fallback)
│   ├── api/            OpenF1 API integration
│   └── gameEngine/     Survivor rules logic
└── data/               2025 drivers, race calendar, seed stats
```

## 🛠️ Tech Stack

- **React 18** + **Vite**
- **React Router v6**
- **Firebase 10** (auth + firestore, optional)
- **Tailwind CSS**
- **Recharts** (driver stats charts)
- **date-fns**
- **lucide-react** (icons)
