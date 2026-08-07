# ♻️ TossSync — Waste Pickup, Simplified

TossSync is a full-stack **MERN** platform that connects waste-management providers with the residents they serve. Providers (admins) publish pickup cycles and onboard residents in bulk; residents get a personalized dashboard with live countdowns, offline **Google Calendar** reminders, and **Web Push** notifications — so a bin is never missed again.

---

## 📖 Project Overview

Waste collection schedules are notoriously easy to forget. TossSync solves this with two coordinated experiences:

- **Provider / Admin Dashboard** — create and manage recurring pickup cycles, invite residents via a shareable link + QR poster, assign cycles to residents through a lightweight CRM, and run bulk onboarding tools.
- **Resident Dashboard** — a role-aware view (Solo vs. Managed) featuring a next-pickup countdown, a personal reminder schedule, dual-cycle syncing, "Add to Google Calendar" offline alarms, and opt-in push notifications with sound + vibration.

The backend is a modular Express API backed by MongoDB (Mongoose), with JWT auth, Nodemailer transactional email, and VAPID Web Push delivery.

---

## ✨ Features

### Provider / Admin
- 🗓️ **Pickup Cycle Builder** — define days-of-week + time, weekly/bi-weekly/monthly/custom frequencies.
- 👥 **Connected Residents CRM** — search, filter, and assign cycles to residents.
- 📤 **Share & Invite** — dynamic onboarding link (`/signup?ref=<businessId>`) + downloadable QR poster.
- 📦 **Bulk Tools & Form Builder** — onboard many residents at once and customize intake.
- 📊 **Overview** — at-a-glance organization stats.

### Resident
- ⏳ **Countdown Hero** — live time-to-next-pickup for provider + personal schedules.
- 🔁 **Dual-Cycle Toggle** — blend a provider cycle with personal pickup dates.
- 📆 **Add to Google Calendar** — generates a UTC-formatted calendar template URL for an offline device alarm.
- 🔔 **Web Push Notifications** — service-worker notifications with `vibrate: [200, 100, 200]`, `requireInteraction`, and default device sound.
- 🚩 **Missed Pickup Reporting** — flag a missed collection to the provider.

### Platform
- 📧 **Transactional Email** — branded registration codes + pickup reminders. Reminders are **dynamically sent on behalf of the provider** (`From: "<Org>" <noreply@tosssync.com>`, `Reply-To: <admin email>`) and can be **batch-dispatched** with `Promise.all` over the resident array.
- 🔐 **Auth** — email/password + social auth, JWT sessions, password reset via email.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 7, **Tailwind CSS v4** (`@tailwindcss/vite`), **GSAP 3** (`@gsap/react`), React Router 8, Redux Toolkit, Formik + Yup, Axios, react-toastify, qrcode.react, @iconify/react |
| **Backend** | Node.js, Express 5, Mongoose 9 (MongoDB), JSON Web Tokens, bcryptjs |
| **Notifications** | Nodemailer (Gmail), web-push (VAPID), Service Worker (Web Push API) |
| **Auth / Media** | Firebase (social auth) |
| **Tooling** | ESLint 9, Vite, dotenv |

> **Zero-Loop code style:** the codebase deliberately avoids `for` / `for..of` / `for..in` / `while` loops — all iteration uses `.map()`, `.filter()`, `.reduce()`, and friends.

---

## 🗂️ Monorepo Structure

```
TossSync/
├── client/                 # React + Vite frontend
│   ├── public/
│   │   └── sw.js           # Web Push service worker
│   └── src/
│       ├── api/axios.js    # Axios instance (VITE_API_BASE_URL)
│       ├── components/     # Dashboard (admin + resident) UI
│       ├── lib/            # cycleTime, calendar URL + date helpers
│       ├── pages/          # Route pages (auth, dashboard, homepage)
│       └── main.jsx        # Router + service-worker registration
├── server/                 # Express + Mongoose API
│   ├── config/db.js        # Mongo connection
│   ├── controllers/        # auth, organization, schedule
│   ├── middlewares/        # JWT auth guard
│   ├── models/             # User, Organization, Schedule, PasswordReset
│   ├── routes/             # /api/auth, /api/organization, /api/schedule, /api/push
│   ├── utils/              # emailService, pushService, codeGenerator
│   └── index.js            # App entry (CORS, routers, error handling)
└── README.md
```

---

## ✅ Prerequisites

- **Node.js** ≥ 18 (Node 20+ recommended — the dev script uses the built-in `--watch` flag)
- **npm** ≥ 9
- A **MongoDB** database (local or Atlas)
- A **Gmail** account with an [App Password](https://support.google.com/accounts/answer/185833) (for Nodemailer)
- **VAPID keys** for Web Push (generate with `npx web-push generate-vapid-keys`)
- A **Firebase** project (for social auth)

---

## 🔑 Environment Variables

Create a `.env` file in **each** package (`server/.env` and `client/.env`).

### Server (`server/.env`)

| Variable | Required | Description | Fallback (dev) |
|----------|:--------:|-------------|----------------|
| `URI` | ✅ | MongoDB connection string | — |
| `PORT` | ❌ | Port the API listens on | `7890` |
| `APP_URL` | ❌ | Comma-separated allowed frontend origins (also used in email links) | `http://localhost:5173,http://localhost:5174,https://toss-sync.vercel.app/` |
| `JWT_SECRET` | ✅ | Secret used to sign/verify JWTs | — |
| `EMAIL_USER` | ❌ | Gmail address used as the sender | `oladoyeajiboye@gmail.com` |
| `GOOGLE_APP_PASSWORD` | ✅ | Gmail App Password for Nodemailer | — |
| `VAPID_PUBLIC_KEY` | ⚠️ | Web Push VAPID public key (push disabled if unset) | `''` |
| `VAPID_PRIVATE_KEY` | ⚠️ | Web Push VAPID private key (push disabled if unset) | `''` |
| `VAPID_SUBJECT` | ❌ | VAPID contact (`mailto:` or `https:`) | `mailto:support@tosssync.com` |

### Client (`client/.env`)

| Variable | Required | Description | Fallback (dev) |
|----------|:--------:|-------------|----------------|
| `VITE_API_BASE_URL` | ❌ | Base URL of the Express API (without `/api`) | `http://localhost:7890` |
| `VITE_APP_URL` | ❌ | Public frontend URL used to build invite links | `window.location.origin` |
| `VITE_API_KEY` | ✅ | Firebase API key | — |
| `VITE_AUTH_DOMAIN` | ✅ | Firebase auth domain | — |
| `VITE_PROJECT_ID` | ✅ | Firebase project ID | — |
| `VITE_STORAGE_BUCKET` | ✅ | Firebase storage bucket | — |
| `VITE_SENDER_ID` | ✅ | Firebase messaging sender ID | — |
| `VITE_APP_ID` | ✅ | Firebase app ID | — |
| `VITE_MEASUREMENT_ID` | ❌ | Firebase Analytics measurement ID | — |

> ⚠️ `VITE_*` values are embedded into the client bundle at build time and are therefore **public**. Never place secrets (JWT secret, DB URI, app passwords) in the client `.env`.

---

## 🚀 Installation & Run

Clone the repo, then set up each package.

```bash
git clone https://github.com/Oladoye-Ajiboye4/TossSync.git
cd TossSync
```

### 1. Backend

```bash
cd server
npm install
# create server/.env with the variables above
npm run dev      # hot-reload via node --watch
# or: npm start  # plain node index.js
```

The API starts on **http://localhost:7890** (or your `PORT`).

### 2. Frontend

```bash
cd client
npm install
# create client/.env with the variables above
npm run dev
```

The app starts on **http://localhost:5173** (Vite default).

### 3. Production build (client)

```bash
cd client
npm run build     # outputs to client/dist
npm run preview   # locally preview the production build
```

---

## 🔌 API Overview

| Base Route | Purpose |
|------------|---------|
| `GET /` | Health check |
| `/api/auth` | Registration, login, social auth, password reset |
| `/api/organization` | Provider org, residents, connect-by-business-id, cycles |
| `/api/schedule` | Resident schedules & assignments |
| `/api/push` | VAPID public key, subscribe/unsubscribe, send |

All protected routes expect an `Authorization: Bearer <token>` header.

---

## 🧪 Notes & Conventions

- **Styling:** Tailwind CSS v4 utility classes only (brand tokens: sage `#A8BBA3`, brown `#B87C4C`, light-brown `#C4A484`, beige `#F7F1DE`).
- **Animations:** GSAP via `@gsap/react`'s `useGSAP` (auto-reverting, cleanup-safe).
- **Resilience:** the API registers `unhandledRejection` / `uncaughtException` guards plus a central Express error handler so a single async slip never crashes the process.

---

## 📄 License

ISC © TossSync. Built with ♻️ for cleaner neighborhoods.
