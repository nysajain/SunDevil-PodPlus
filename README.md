# SunDevil Pods+
Barrier-aware micro-communities (pods of 5–8) matched by zone + 45-min window + interests, guided by a peer captain and a semester-long Connection Quests game.

[Live demo](https://sun-devil-pods-plus.vercel.app)

## Table of Contents
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [Run (dev)](#run-dev)
  - [Build & Preview](#build--preview)
- [Data Seeds & Matching](#data-seeds--matching)
- [App Walkthrough](#app-walkthrough)
- [Configuration](#configuration)
- [Accessibility Notes](#accessibility-notes)
- [Deploy to Vercel](#deploy-to-vercel)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Credits](#credits)
- [License](#license)

## Key Features
- 90-second signup covering interests, availability windows, zones, and optional identity tags
- Automated pod matching (5–8 people) respecting barrier-aware constraints from the matcher
- Semester-long Connection Quests with 14-week arc and once-per-week check-in tracking
- Pod points, badge unlocks, and a mock rewards store that links to Sun Devil Rewards for more perks
- Meeting space selector with ADA and sensory flags; captains control availability overrides
- Role-aware dashboard that flips between student and captain experiences via stored role state
- Captain Console with attendance + quest grid (W1–W14), vibe average, and quest issuing controls
- Belonging Pulse three-question Likert survey with delta visual and local history
- Accessibility-minded UI with high contrast combos, keyboard-first interactions, and reduce-motion option

## Architecture
- Client: React 18 + Vite + TypeScript backed by Tailwind CSS (see `tailwind.config.js` for ASU palette tokens)
- Data: static JSON under `public/data` (users, pods, spaces, quests, badges, rewards, interests) hydrated at runtime; session state persisted via localStorage
- Matching: `scripts/match.ts` (compiled to `scripts/match.js`) converts CSV signups into `public/data/pods.json`
- Build & tooling: Vite scripts (`dev`, `build`, `preview`) and auxiliary `build:scripts` TypeScript compile for Node utilities
- Deploy: static export hosted on Vercel (`sun-devil-pods-plus.vercel.app`)

## Getting Started

### Prerequisites
- Node 18+ (align with Vercel default runtime)
- npm (project ships with `package-lock.json`)

### Install
```bash
npm install
```

### Run (dev)
```bash
npm run dev
# Vite serves at http://localhost:5173 by default
```

### Build & Preview
```bash
npm run build
npm run preview
# Serves the production build from dist/ on http://localhost:4173
```

## Data Seeds & Matching
- JSON seeds live in `public/data/users.json`, `spaces.json`, `quests.json`, `badges.json`, `rewards.json`, `interests.json`, and `pods.json`
- Update these files directly for demo tweaks; localStorage augments them per visitor session
- Generate pods from CSV:

```bash
# CSV columns: name,email,zone,interests,times,tags (see public/data/students.csv for a sample)
npm run match
# Outputs refreshed public/data/pods.json
```

- The TypeScript source (`scripts/match.ts`) may be edited and recompiled via `npm run build:scripts` if needed

## App Walkthrough
1. **Home:** choose *Join Pods* or *Become a Peer Captain*; sponsor logos live as placeholders in `/public/partners/*`.
2. **Sign Up:** capture interests, 45-minute windows, campus zone, and optional lived-experience tags that influence matching.
3. **Student Dashboard:** see roster, weekly Connection Quest, single-use weekly check-in, pod points & badges grid, meeting space controls (captain-only edits), Belonging Pulse modal, and Pod Rewards Store.
4. **Captain Application:** upload resume (PDF), select campuses and availability, pledge to program expectations, and review incentive card for Letter of Recommendation + Completion Certificate.
5. **Captain Console:** monitor attendance & quest grid (W1–W14), vibe trend average, issue quests, manage space availability, and view outreach recommendations.

## Configuration
- Environment variables: none required for the local demo (all data is static or stored in-browser)
- Feature flags: not implemented; behavior toggles rely on role stored in localStorage (`role`, `currentUserId`, etc.)
- Styling: Tailwind theme extends ASU-inspired maroon/gold gradients (`tailwind.config.js` + `postcss.config.js`)

## Accessibility Notes
- All primary interactions are keyboard accessible with focus rings and ARIA labels where needed
- Reduce motion preference respected via Tailwind utility variants
- Meeting spaces include sensory-friendly and ADA tags to guide inclusive selections

## Deploy to Vercel
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Framework preset: Vite (auto-detected)

Using Vercel CLI:
```bash
npm i -g vercel
vercel
vercel --prod
```

## Project Structure
```
├─ docs/
│  ├─ screenshots/              # image placeholders referenced in README
│  └─ *.md                      # pitch, demo notes, captain toolkit
├─ public/
│  ├─ data/                     # users.json, pods.json, spaces.json, quests.json, badges.json, rewards.json, interests.json
│  └─ partners/                 # sponsor logo placeholders (png)
├─ scripts/
│  ├─ match.ts                  # CSV ➜ pods.json generator (TypeScript)
│  └─ match.js                  # compiled matcher invoked by npm run match
├─ src/
│  ├─ components/               # BelongingPulse modal, SpacePicker controls
│  ├─ lib/                      # points, roles, week helpers, storage utilities
│  ├─ pages/                    # Home, SignUp, PodDashboard, CaptainApply, CaptainConsole, Store, ApplySuccess
│  ├─ App.tsx                   # route shell
│  └─ main.tsx                  # Vite entry
├─ tailwind.config.js           # Tailwind theme tokens for ASU palette
├─ vite.config.ts               # Vite project configuration
└─ package.json                 # scripts (dev/build/preview/match/build:scripts)
```

## Testing
- Not yet added (manual QA via Vite dev server and build checks)

## Known Limitations
- Demo relies on local JSON files and browser storage; data resets per device
- No authentication or real ASU identity integration
- Weekly gating depends on client clock heuristics

## Roadmap
- Integrate Supabase/Postgres backend with ASU SSO
- Build analytics + export pipeline to Sun Devil Rewards
- Sync with real room availability feeds
- Polish mobile experience and ship as a PWA

## Credits
- Team AVN K: Nysa Jain, Vaishnavi Mahajan, Krishna Balaji, Asmi Kachare
- Student Success Center coaches and student feedback from ideation sessions

## License
- MIT (add a LICENSE file before wider distribution)
