# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 📐 Architecture & onboarding → [PROJECT.md](./PROJECT.md) · 📁 Carte des dossiers → [FILES.md](./FILES.md) · 🧠 Règles durables → [MEMORY.md](./MEMORY.md) · 📱 Conventions mobile & sortie MVP → [MOBILE_GUIDELINES.md](./MOBILE_GUIDELINES.md)
>
> ✅ **Avant de conclure toute tâche de code, dérouler [QUALITY_GATE.md](./QUALITY_GATE.md) sur le périmètre modifié et produire le rapport PASS/WARNING/FAIL.**
>
> 📋 **Avant toute tâche** : consulter les flux utilisateur dans [workflow/](./workflow/) (diagrammes de référence de chaque parcours) et le contrat d'interface backend [API.md](./API.md) (routes, auth, formats de réponse). Tout changement de parcours met à jour `workflow/` ; tout changement d'appel backend respecte `API.md`.
>
> 🔁 **Tout développement suit le processus en 12 étapes de [WORKFLOW.md](./WORKFLOW.md)** (comprendre → lire les référentiels → planifier → développer → tester → quality gate → documenter → résumer). Toute modification qui casse une convention documentée exige une confirmation explicite avant de continuer.

## Commands

```bash
# Start dev server (Expo Go)
npx expo start

# Run on specific platform
npm run android       # npx expo run:android
npm run ios           # npx expo run:ios
npm run web           # expo start --web

# Lint and format
npm run lint          # ESLint + Prettier check
npm run format        # ESLint --fix + Prettier --write

# EAS builds
eas build --profile development --platform android   # debug APK
eas build --profile preview                          # internal distribution
eas build --profile production                       # store release
eas build --profile simulator --platform ios         # iOS simulator build

# Store submission (production)
eas build -p ios --profile production --submit       # build + App Store Connect
eas build -p android --profile production --submit   # build + Play Store

# Versioning (appVersionSource: "remote" — EAS owns build numbers)
eas build:version:get                                # current remote versions

# Diagnostics
npx expo-doctor                                      # project health check
npx expo install --fix                               # align dependency versions with the SDK
```

There is no test suite; there are no test commands.

## Architecture

### Routing
The app uses **expo-router** (file-based routing). The root layout at `app/_layout.tsx` implements an auth gate: unauthenticated users are redirected to `/(auth)/login`, authenticated users without completed onboarding go to `/onbording`, and fully onboarded users reach `/(tabs)`.

Route groups:
- `app/(auth)/` — login, register, forgot password (Firebase Auth)
- `app/(tabs)/` — main tab nav: home, invoices, contacts, settings
- `app/(modals)/` — country and language picker modals
- `app/invoices/generate/` — multi-step invoice creation wizard
- `app/onbording/` — first-run onboarding flow (note: folder name has typo, keep it)

### State Management
A single **Zustand** store at `store/index.ts` persists all app data to AsyncStorage under a per-user key `facture-store-{uid}` (scoped at login by `store/user-scope.ts`; the legacy single key is adopted by the first account that signs in). It owns:
- `profile` — the sender's `BusinessEntity` (name, address, TVA, currency, taxRate, country, language)
- `invoices` — array of all saved invoices
- `newInvoice` — the in-progress invoice being created (Partial<Invoice>)
- `contacts` — saved recipients (auto-added when an invoice is saved)
- `onboardingCompleted` / `onboardingStep` — flow control for first-run

The store includes a `migrate` function for forward-compatibility when adding new profile fields.

### Invoice Creation Flow
The wizard lives in `app/invoices/generate/`:
1. `index.tsx` — invoice number, issue date, due date (validated with Zod via React Hook Form)
2. `contact.tsx` or `new-contact.tsx` — recipient selection (route chosen based on whether contacts exist)
3. `items.tsx` — line items
4. `summary.tsx` — review + save + PDF generation

`store.startNewInvoice()` must be called before entering the wizard; it pre-fills sender from profile and generates an invoice number. `store.saveInvoice()` commits `newInvoice` to `invoices` and auto-adds the recipient to `contacts`.

### PDF Generation
`app/utils/pdf.ts` uses `expo-print` to render an HTML template to PDF and saves it to `FileSystem.documentDirectory`. The PDF is then shareable via `expo-sharing`. The currency is currently hardcoded to TND in the HTML template.

### Domain Layer (REST API)
`domain/` contains a REST client for `https://invoice-backend-qq9j.onrender.com`. It uses Firebase ID tokens (`domain/authorization.ts` → `auth.currentUser?.getIdToken()`). This layer is **partially implemented** and not yet wired to the UI — the app currently operates on local Zustand state only.

### Authentication
Firebase Auth (JS SDK via `app/config.ts`). The `_layout.tsx` subscribes to `auth.onAuthStateChanged` to reactively redirect. The `domain/` API layer uses Firebase tokens for backend calls.

### Styling
**NativeWind** (Tailwind for React Native). Use `className` props with Tailwind utility classes. The Prettier plugin (`prettier-plugin-tailwindcss`) auto-sorts class names — always run `npm run format` after editing classes.

### Forms
All forms use **React Hook Form** with **Zod** resolvers. Schemas live in `app/schema/invoice.ts`. Custom form components (`CustomInputText`, `CustomDatePicker`, `NumericInputText`) in `components/` are designed to be used inside a `<FormProvider>`.

## Conventions

- **Import alias**: `~/` maps to the project root. Prefer `~/store`, `~/components/X`, etc. over relative paths.
- **Language**: UI strings and most comments are in French; this is intentional — the app targets French-speaking users (Tunisia/France, called "Fatourty").
- **Invoice number format**: `INV-YYYY-NNNN` (e.g. `INV-2026-0042`) — aligned with the backend `tag` format; yearly sequence with a collision check that accounts for pulled server invoices. Generated by `app/utils/invoice.ts:generateInvoiceNumber`.
- **Invoice status values**: French strings `'payée' | 'en attente'` persisted locally (`'en retard'` is display-only, derived from the due date). Backend statuses (English: `Pending`, `Paid`…) are mapped exclusively in `domain/mappers.ts` — default pushed status is `Pending`.
- **Dates**: always display via `formatDate` (`fr-FR`, dd/mm/yyyy) — never bare `toLocaleDateString()` (device locale would give mm/dd/yyyy).
- **`BusinessEntity`** is used for both the sender (stored in `profile`) and recipients/contacts — same type, same schema.
- The `domain/` folder's `authorization.ts` imports Firebase via the relative path `'../app/config'` — keep this relative import.
- **No test files exist** in this codebase. Do not expect or create test infrastructure unless explicitly asked.
