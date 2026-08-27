# KetemuIn

KetemuIn is a lost-and-found web application built with **React + TypeScript**, powered by **Firebase Authentication** and **Cloud Firestore**.

Users can publish reports for lost (`HILANG`) or found (`DITEMUKAN`) items, filter/search reports, and contact report owners.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4
- **Backend/Server:** Express (for local/prod serving)
- **Database & Auth:** Firebase Firestore + Firebase Auth
- **UI & Motion:** lucide-react, motion

## Features

- User registration & login
- Create lost/found reports
- Filter by category and report type
- Search reports by title/description/location
- Report detail view
- User profile view
- Mark report as completed (`SELESAI / KETEMU`)

## Project Structure

```text
.
├─ src/
│  ├─ components/        # UI components (cards, form, auth, profile, etc.)
│  ├─ lib/firebase.ts    # Firebase initialization + error helpers
│  ├─ App.tsx            # Main app flow (auth, reports, filtering)
│  ├─ main.tsx           # React entry point
│  └─ types.ts           # Shared TypeScript types
├─ server.ts             # Express + Vite middleware/static server
├─ vite.config.ts        # Vite config (React + Tailwind)
└─ package.json
```

## Prerequisites

- Node.js 18+ (recommended latest LTS)
- npm
- Firebase project with Auth + Firestore enabled

## Environment Setup

This project reads Firebase config from:

- `firebase-applet-config.json` (already referenced by `src/lib/firebase.ts`)

If you also use environment variables in your deployment workflow, create an `.env` file as needed for your platform.

## Installation

```bash
npm install
```

## Available Scripts

- `npm run dev` → Run app in development mode (`tsx server.ts`)
- `npm run build` → Build frontend and bundle server into `dist/server.cjs`
- `npm run start` → Run production build (`node dist/server.cjs`)
- `npm run preview` → Preview Vite build
- `npm run lint` → Type check (`tsc --noEmit`)
- `npm run clean` → Remove build artifacts

## Run Locally

```bash
npm run dev
```

Then open:

- `http://localhost:3000`

## Production Build

```bash
npm run build
npm run start
```

## Data Model (Simplified)

### User

- `id_user`
- `nama_lengkap`
- `no_whatsapp`
- `created_at`
- `is_admin` (optional)

### Report

- `id_report`
- `id_user`
- `tipe_laporan` (`HILANG` | `DITEMUKAN`)
- `kategori`
- `judul`
- `deskripsi`
- `foto_url`
- `lokasi`
- `tgl_kejadian`
- `status_selesai`
- `created_at`

## Notes

- Existing UI labels are primarily in Indonesian.
- `index.html` title may still use a default template title and can be updated to match branding.

## License

No license file is currently defined in this repository.
