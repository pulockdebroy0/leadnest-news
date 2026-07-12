# Leadnest News — Environment Variable Audit

Method: every `process.env.X` (literal and bracket-notation) reference was
located with `grep` across `src/`, `prisma/`, `next.config.ts`, and
`src/proxy.ts`, then traced to its consuming file. Auth.js's two implicit
variables were confirmed by reading `node_modules/next-auth`'s own source
(not assumed) since they're never written as literal `process.env.X` in this
repo's code. Nothing below is guessed — every row cites the exact file(s)
that read it.

---

## 1. Required Environment Variables

These either crash the app at runtime if unset, or are required for the
single most basic thing the app needs to do (let an administrator log in).

### `DATABASE_URL`
- **Required**
- **Used by:** `prisma/schema.prisma:11` (`env("DATABASE_URL")`, read by the Prisma CLI itself), `src/lib/prisma.ts:15` (Prisma Client's connection adapter), `prisma/seed.ts:5`
- **Purpose:** PostgreSQL connection string — the entire data layer (articles, users, everything)
- **Behavior if missing:** `src/lib/prisma.ts` throws explicitly: `"DATABASE_URL is not set. Copy .env.example to .env..."`
- **Example:**
  ```
  postgresql://username:password@host:5432/database?sslmode=require
  ```

### `AUTH_SECRET`
- **Required** (in production)
- **Used by:** not a literal `process.env` call in this repo — read implicitly by the `next-auth` package itself (confirmed in `node_modules/next-auth/lib/env.js` and `index.js`) whenever `src/lib/auth.ts` calls `NextAuth(...)` without an explicit `secret` option
- **Purpose:** signs/encrypts session JWTs for the admin CMS (`src/proxy.ts` gates `/leadnest-admin-x7k2/*` and `/api/admin/*` on a valid session)
- **Behavior if missing:** Auth.js throws `MissingSecretError` in production
- **Example:**
  ```
  a1b2c3d4e5f6...   # generate with: openssl rand -hex 32
  ```

### `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- **Technically optional, practically required** — `prisma/seed.ts:41-42` falls back to `admin@leadnest.tech` / `leadnest-admin-2026` if unset, so the seed script won't crash without them, but deploying with the hardcoded fallback password is a real credential left in a public repo. Treat as required for any non-throwaway deployment.
- **Used by:** `prisma/seed.ts` (creates the one Administrator account your CMS login depends on)
- **Purpose:** first-login credentials for `/leadnest-admin-x7k2/login`
- **Example:**
  ```
  ADMIN_EMAIL=editor@yourdomain.com
  ADMIN_PASSWORD=a-long-unique-password
  ```

---

## 2. Optional Variables

Grouped by feature. "Consumed by" lists every file that actually reads the
value — not just where it's declared.

### AI providers (`src/lib/ai/*`) — need at least one for AI buttons to work
| Variable | Consumed by | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | `src/lib/ai/gemini.ts` | Provider 1 (priority default) |
| `GEMINI_MODEL` | `src/lib/ai/gemini.ts` | Override, defaults to `gemini-2.0-flash` |
| `GROQ_API_KEY` | `src/lib/ai/groq.ts` | Provider 2 (fallback) |
| `GROQ_MODEL` | `src/lib/ai/groq.ts` | Override, defaults to `llama-3.3-70b-versatile` |
| `OPENROUTER_API_KEY` | `src/lib/ai/openrouter.ts` | Provider 3 (fallback) |
| `OPENROUTER_MODEL` | `src/lib/ai/openrouter.ts` | Override, defaults to `meta-llama/llama-3.3-70b-instruct:free` |
| `HUGGINGFACE_API_KEY` | `src/lib/ai/huggingface.ts` | Provider 4 (last-resort fallback) |
| `HUGGINGFACE_MODEL` | `src/lib/ai/huggingface.ts` | Override, defaults to `meta-llama/Llama-3.2-3B-Instruct` |
| `AI_TIMEOUT_MS` | `src/lib/ai/provider.ts` | Per-provider timeout, default `20000` |
| `AI_RPM_GEMINI` / `AI_RPM_GROQ` / `AI_RPM_OPENROUTER` / `AI_RPM_HUGGINGFACE` | `src/lib/ai/provider.ts` | Local per-provider rate caps, defaults 12/25/15/10 |

### Storage (`src/lib/storage.ts`)
| Variable | Consumed by | Purpose |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | `src/lib/storage.ts` | Vercel Blob — preferred media storage |
| `UPLOADTHING_TOKEN` | `src/lib/storage.ts` | UploadThing — used only if Blob token absent. **Note:** the code checks this exact name; it does **not** check `UPLOADTHING_SECRET` or `UPLOADTHING_APP_ID` (older UploadThing API shape) — if that's what you have, rename to `UPLOADTHING_TOKEN` |

If neither is set, `uploadFile()` falls back to writing into `/public/uploads` — fine for local dev, **does not persist** on Vercel's serverless filesystem.

### Analytics, Search Console & Ads (`src/lib/settings.ts`)
These are read dynamically via `process.env[key]` in `getSetting()`, so they won't appear as literal `process.env.X` in a plain-text search — I traced them through `SETTING_KEYS` in `src/lib/settings.ts` instead. Each one can *also* be set from the admin **Settings** page (stored in the `Setting` DB table); an env var of the same name always wins over the DB value.

| Variable | Consumed by | Purpose |
|---|---|---|
| `GA4_MEASUREMENT_ID` | `src/components/common/AnalyticsScripts.tsx`, admin `analytics/page.tsx` | Loads gtag.js |
| `GSC_VERIFICATION` | `src/app/(site)/layout.tsx` (`generateMetadata`) | Google Search Console meta-tag verification |
| `CLARITY_PROJECT_ID` | `src/components/common/AnalyticsScripts.tsx` | Microsoft Clarity |
| `ADSENSE_CLIENT_ID` | `src/components/ads/AdSlot.tsx`, `AnalyticsScripts.tsx` | Renders real AdSense units instead of the placeholder box |
| `AD_MANAGER_NETWORK_CODE` | **Nowhere.** Only declared as a key in `settings.ts` and editable on the Settings form — no component reads it. See §3. |

### Web push (`src/lib/push.ts`)
| Variable | Consumed by | Purpose |
|---|---|---|
| `VAPID_PUBLIC_KEY` | `src/app/(site)/layout.tsx` (passed to `EnablePushButton`), `src/lib/push.ts` | Public push key |
| `VAPID_PRIVATE_KEY` | `src/lib/push.ts` | Signs push payloads server-side |

### Email (`src/lib/mailer.ts`) — see important caveat in §6
| Variable | Consumed by | Purpose |
|---|---|---|
| `RESEND_API_KEY` | `src/lib/mailer.ts` | Existence-check only |
| `SENDGRID_API_KEY` | `src/lib/mailer.ts` | Existence-check only |
| `SMTP_URL` | `src/lib/mailer.ts` | Existence-check only (single connection-string var — **not** separate `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`) |

### Seeding
| Variable | Consumed by | Purpose |
|---|---|---|
| `SEED_SAMPLE_DATA` | `prisma/seed.ts` | Set to `"true"` to also insert demo articles/authors; omitted in production so the DB ships empty |

### Auth.js (implicit — see §1 for why this isn't a grep match)
| Variable | Purpose |
|---|---|
| `AUTH_URL` | Canonical site URL for callback construction. Because `src/lib/auth.ts` sets `trustHost: true`, Auth.js infers the URL from the request's `Host` header instead — this is genuinely optional on Vercel and most reverse proxies. Set it only if you hit callback-URL issues. |

### Framework-managed (do not set manually)
| Variable | Purpose |
|---|---|
| `NODE_ENV` | Read in `src/lib/prisma.ts` to toggle query logging and the dev hot-reload singleton guard. Set automatically by Next.js/Vercel — never set this yourself. |

---

## 3. Unused / Not-Yet-Wired Variables

Nothing is dead-and-safe-to-delete — every declared variable is at least
read somewhere. One is read but never *applied*:

- **`AD_MANAGER_NETWORK_CODE`** — stored via the Settings form and present
  in `SETTING_KEYS`, but no component (`AdSlot.tsx` or elsewhere) actually
  reads it to inject a Google Ad Manager tag. AdSense has real script
  injection (`AnalyticsScripts.tsx`, `AdSlot.tsx`); Ad Manager does not yet.
  Keep the variable defined for forward-compatibility, but know that
  setting it currently has **no visible effect**.

If you don't plan to use a given optional integration (e.g. you'll never
use Hugging Face because Gemini/Groq are enough), it's safe to simply leave
that variable blank — nothing in the code requires every optional var to
be present, each is checked independently with `isConfigured()`.

---

## 4. `.env.example`

See the generated file alongside this report — it documents every variable
listed above, grouped and commented the same way, with obviously-fake
placeholder values only.

---

## 5. Deployment Readiness (Vercel)

### Required before deploy
Set these in Vercel's Project → Settings → Environment Variables *before*
your first deploy, or the build/runtime will fail or leave an insecure
default admin account live:

| Variable | Why it blocks/matters |
|---|---|
| `DATABASE_URL` | App throws on any request without it. **Must be reachable from Vercel's network** — a `localhost` Postgres won't work; use a managed provider (Neon, Supabase, Railway, Vercel Postgres). If you provision Postgres through a Vercel marketplace integration, it may inject differently-named variables (e.g. `POSTGRES_PRISMA_URL`) — copy that value into a variable named exactly `DATABASE_URL`, since that's the only name this codebase reads. |
| `AUTH_SECRET` | Auth.js throws `MissingSecretError` in production without it. |
| `ADMIN_EMAIL` + `ADMIN_PASSWORD` | Not required to *build*, but required before running `npm run db:seed` against production — otherwise your live Administrator account uses the hardcoded fallback password from `prisma/seed.ts`. |

Also required as a one-time **command**, not an env var: after the first
deploy, run `npm run db:migrate` (or `db:deploy`) and `npm run db:seed`
against the production `DATABASE_URL` — an empty database has no schema
and no login until you do.

### Optional after deploy
Everything else — add these whenever you're ready to light up that
feature; the app runs correctly without them, just with that feature
inactive:

- `GEMINI_API_KEY` (recommended first — unlocks all AI CMS tools for free)
- `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `HUGGINGFACE_API_KEY` (AI fallback resilience)
- `AI_TIMEOUT_MS`, `AI_RPM_*` (only if you need to tune away from defaults)
- `BLOB_READ_WRITE_TOKEN` or `UPLOADTHING_TOKEN` (media uploads won't persist on Vercel without one of these)
- `GA4_MEASUREMENT_ID`, `GSC_VERIFICATION`, `CLARITY_PROJECT_ID` — can also be set later from the admin Settings page instead of env vars
- `ADSENSE_CLIENT_ID`, `AD_MANAGER_NETWORK_CODE`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (generate via `npx web-push generate-vapid-keys`)
- `RESEND_API_KEY` / `SENDGRID_API_KEY` / `SMTP_URL` — **and** implement `sendEmail()` in `src/lib/mailer.ts` (see §6)
- `SEED_SAMPLE_DATA` — only for a staging/demo environment, never production
- `AUTH_URL` — only if you see callback-URL issues behind a non-standard proxy

---

## 6. Missing / Undocumented Variables Found in Code

Referenced by real code but **absent from the `.env.example` that shipped
previously** — now added to the regenerated file:

- `SENDGRID_API_KEY` — checked in `src/lib/mailer.ts`, was undocumented
- `SMTP_URL` — checked in `src/lib/mailer.ts`, was undocumented
- `SEED_SAMPLE_DATA` — checked in `prisma/seed.ts`, was undocumented

### Important caveat on the email variables
`src/lib/mailer.ts` checks for `RESEND_API_KEY` / `SENDGRID_API_KEY` /
`SMTP_URL` only to decide whether to return a "configured" vs
"not configured" status — **the actual `sendEmail()` function has no
provider implementation and unconditionally throws** `"sendEmail() has not
been implemented for the configured provider yet."` Setting any of these
three variables will not make newsletter emails actually send; you still
need to write the fetch call for your chosen provider inside that function.
This is documented in the file's own comments, but it's worth being
explicit here since it's the one feature where "the env var is set"
doesn't mean "the feature works."

### Not implemented anywhere (in case you expected them from other projects)
These are common Next.js env var names that this specific codebase does
**not** reference at all — setting them will have no effect:

- `NEXT_PUBLIC_SITE_URL` — the site's canonical domain is a hardcoded
  string, `SITE.domain` in `src/lib/constants.ts`. Changing domains means
  editing that file, not setting an env var.
- `GOOGLE_TAG_MANAGER_ID` — only GA4's `gtag.js` is wired
  (`GA4_MEASUREMENT_ID`), not a separate GTM container.
- `VERCEL_BLOB_READ_WRITE_TOKEN` — the real name this code checks is
  `BLOB_READ_WRITE_TOKEN` (no `VERCEL_` prefix).
- `UPLOADTHING_SECRET` / `UPLOADTHING_APP_ID` — superseded by the single
  `UPLOADTHING_TOKEN` this code actually checks.
- `GOOGLE_ANALYTICS_ID` / `GOOGLE_SITE_VERIFICATION` / `MICROSOFT_CLARITY_ID`
  / `GOOGLE_ADSENSE_ID` / `GOOGLE_AD_MANAGER_ID` — this project's actual
  names are `GA4_MEASUREMENT_ID`, `GSC_VERIFICATION`, `CLARITY_PROJECT_ID`,
  `ADSENSE_CLIENT_ID`, and `AD_MANAGER_NETWORK_CODE` respectively.
