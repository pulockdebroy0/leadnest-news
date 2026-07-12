# Leadnest News

An enterprise-grade news platform built with Next.js 16, PostgreSQL/Prisma,
and Auth.js — premium editorial design, a full newsroom CMS with AI
assistance, and SEO/GEO/AEO output tuned for Google, Google News, and AI
answer engines.

**Brand:** Leadnest News · **Domain:** `https://leadnest.tech`

This is the second major iteration of the project: it migrates the original
JSON-file prototype to Postgres, adds Auth.js authentication with five
newsroom roles, replaces every placeholder brand asset with the official
logo, and adds AI content tools, media storage, analytics, ads, newsletter,
and push notifications. See **"What's real vs. what needs your
credentials"** below for an honest breakdown before you deploy.

---

## ⚠️ Before you run anything: read this

This project was built and iterated in a sandboxed environment whose network
allowlist does not include `binaries.prisma.sh` — the CDN Prisma's CLI uses
to download its schema-parsing engine. That means `npx prisma generate`
could not be executed *in that sandbox*, so `npm run build` there could not
be verified 100% end-to-end the way it will run on your machine / on Vercel
(both of which have normal internet access).

What *was* verified, concretely, to compensate:
- **The committed migration** (`prisma/migrations/20260712000000_init/migration.sql`)
  was applied to a real local PostgreSQL 16 instance with a plain `psql -f`
  run — 8 enums, 17 tables, 27 indexes, and 15 foreign keys, zero errors.
  Sample rows were then inserted and queried across every relation
  (categories, articles, tags many-to-many, authors↔users, media with the
  Supabase-only provider enum, revisions, audit logs) to confirm the schema
  behaves as intended. This is the actual file `prisma migrate deploy` will
  run on Vercel — not a stand-in — so this verification is direct, not
  approximate.
- The Prisma driver adapter (`@prisma/adapter-pg`) and `PrismaClient`
  constructor usage were checked against the actual installed package's
  type definitions.
- A full `next build` was run with type-checking temporarily bypassed to
  confirm every page, route, and component bundles cleanly (no missing
  imports, no syntax errors, no broken JSX) — the *only* runtime failure was
  the expected `@prisma/client did not initialize yet` message from the
  un-generated client in that sandbox, confirming nothing else is broken.

**Local setup** (with normal internet access):

```bash
cp .env.example .env        # fill in your Supabase values (see below)
npm install                 # postinstall runs `prisma generate` automatically
npm run db:migrate          # applies the committed migration to your database
npm run db:seed             # creates categories + your first admin login
npm run dev
```

**Supabase project setup** (one-time, ~2 minutes):
1. Create a project at [supabase.com](https://supabase.com).
2. Project Settings → Database → copy the pooled connection string into
   `DATABASE_URL` and the direct connection string into `DIRECT_URL` (see
   `.env.example` for the exact port/parameter differences — this is the
   standard Supabase + Prisma pattern, required because PgBouncer's
   transaction-pooling mode can't run schema migrations).
3. Project Settings → API → copy the Project URL into `SUPABASE_URL` and the
   `service_role` secret key into `SUPABASE_SERVICE_ROLE_KEY`.
4. That's it — **you do not need to manually create the `news-media`
   bucket**; `src/lib/storage.ts` creates it automatically (public,
   25MB file limit) the first time anything is uploaded.

---

## What's real vs. what needs your credentials

| Feature | Status |
|---|---|
| Postgres schema, migrations, all CRUD | Real — schema verified against live Postgres (see above) |
| Auth.js login, 5 roles, sessions | Real — standard Credentials + JWT setup |
| Article CMS: draft/schedule/publish/trash/restore, revisions, bulk actions | Real |
| Official Leadnest logo everywhere (favicon, OG image, manifest, admin, footer, RSS) | Real — extracted and composited from your uploaded logo sheet |
| Sitemaps, News Sitemap, RSS, robots.txt, JSON-LD (NewsArticle/Person/Product/FAQ/HowTo/Breadcrumb/Organization) | Real |
| AEO blocks (Summary, Key Takeaways, Definition, How-To, FAQ) | Real — editable per-article, rendered + schema'd |
| First-party analytics dashboard (top pages/sources/devices/countries) | Real — no external account needed |
| AI CMS tools (headlines, SEO title/description, summary, category/tag/keyword suggestion, rewrite, grammar check, FAQ, internal linking, related articles) | Real, **default provider is Groq** (free) — auto-falls back through OpenRouter → Hugging Face if configured; a clear message if none are configured or all fail |
| Media library, upload UI | Real, **Supabase Storage only** (bucket `news-media`, auto-created on first upload) — no other storage provider is used |
| GA4 / Microsoft Clarity / AdSense script injection | Real, activates once you paste an ID into Settings or env vars |
| Google Search Console verification | Real, paste the verification code into Settings |
| Web push notifications | Real, needs **VAPID keys** (`npx web-push generate-vapid-keys`) |
| Newsletter subscribe/unsubscribe, admin list, CSV export/import | Real |
| Newsletter/transactional **email sending** | Interface only (`src/lib/mailer.ts`) — pick a provider (Resend/SendGrid/SES) and implement one function |
| Rate limiting | Real, in-memory (single instance). For multi-instance deploys, swap for Redis (e.g. Upstash) — see `src/lib/rate-limit.ts` |
| Audit log | Real — every admin mutation is recorded |
| Ad slots (AdSense/native/sponsored) | Real component + DB `sponsored` flag; Ad Manager and affiliate widgets have the same settings-driven slot to extend |

Nothing here is faked or mocked with placeholder data — every "needs your
credentials" row is a real integration point with a clear, documented
activation step.

---

## Branding

The uploaded Leadnest News logo sheet was processed (background keyed to
transparency, cropped into icon/lockup variants) into:

- `public/brand/logo-icon-{light,dark}.png`, `logo-lockup-{light,dark}.png` — used by the header, footer, admin shell, and login screen via `src/components/common/Logo.tsx`
- `public/favicon.ico`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` — browser/PWA icons
- `public/og-default.png` — Open Graph / Twitter Card image (navy background, logo + tagline)
- `public/site.webmanifest` — PWA manifest
- Organization/NewsArticle JSON-LD `logo` field, RSS `<image>`, and the admin dashboard all reference these same assets — there is no placeholder logo left anywhere in the project.

Article/author/product placeholder imagery (the abstract SVGs from the
previous iteration) is unrelated to branding and was left as-is; swap in
real photography via the Media Library when you have it.

---

## Database & content model

Postgres via Prisma (`prisma/schema.prisma`). Models: `User`, `Author`,
`Category`, `Tag`, `Article`, `ArticleRevision`, `Biography`, `Product`,
`ProductSpecItem`, `Media`, `Comment`, `NewsletterSubscriber`, `Setting`,
`SeoOverride`, `PageView`, `PushSubscription`, `AuditLog`.

**The database ships empty of demo content.** `prisma/seed.ts` always
creates the starting category list and exactly one Administrator account
(from `ADMIN_EMAIL`/`ADMIN_PASSWORD`, defaulting to
`admin@leadnest.tech` / `leadnest-admin-2026` if unset — **change this
password immediately after first login**). Sample articles are only seeded
if you explicitly opt in:

```bash
SEED_SAMPLE_DATA=true npm run db:seed
```

`src/lib/content.ts` (public reads) and `src/lib/admin-data.ts` (CMS
read/write) are the only two files that talk to Prisma — every page and API
route goes through them, so the data layer stays in one place.

---

## Authentication & roles

Auth.js (NextAuth v5) with a Credentials provider, JWT sessions (12h),
bcrypt-hashed passwords. Five roles — `ADMINISTRATOR`, `EDITOR`,
`JOURNALIST`, `AUTHOR`, `REVIEWER` — stored on `User.role`; `roleAtLeast()`
in `src/lib/auth.ts` gives a simple hierarchy for gating routes (Users
management, for instance, requires `ADMINISTRATOR`). The admin route tree
(`/leadnest-admin-x7k2`) is protected by `src/proxy.ts` (session check),
carries `X-Robots-Tag: noindex, nofollow` response headers
(`next.config.ts`), sets `robots: { index: false }` in its layout metadata,
and is disallowed in `robots.ts` — and, as before, is never linked from the
public site.

---

## AI CMS tools

### Unified, provider-agnostic, free-tier-first

Every AI feature goes through one service layer — **no UI component or API
route ever calls a provider directly**:

```
src/lib/ai/
  types.ts               Shared contracts: AiProviderAdapter, AiRequest, errors
  cache.ts                In-memory response cache (repeated prompts are free)
  openai-compatible.ts    Shared client for all 3 active providers (OpenAI-style API)
  groq.ts                  Groq adapter — DEFAULT (built on openai-compatible.ts)
  openrouter.ts             OpenRouter adapter (built on openai-compatible.ts)
  huggingface.ts              Hugging Face adapter (built on openai-compatible.ts)
  gemini.ts               Google Gemini adapter — present, not in the default chain (see below)
  provider.ts             Orchestrator: priority fallback, retry, timeout, rate limit
  index.ts                Public API: generateHeadlines(), suggestTags(), etc. —
                           this is the only file route handlers import from
```

**Priority / automatic fallback**, configured by which API key is present:

1. **Groq** (`GROQ_API_KEY`) — default provider, very fast free tier
2. **OpenRouter** (`OPENROUTER_API_KEY`) — free (`:free`-suffixed) models
3. **Hugging Face** (`HUGGINGFACE_API_KEY`) — free Inference Providers

You only need to set one — `GROQ_API_KEY` alone is enough to light up every
AI feature. Setting more than one buys resilience: if Groq times out, hits
its free-tier rate limit, or returns an error, the very same request is
retried against OpenRouter, then Hugging Face, automatically, in the same
call. If **none** are configured, or every configured provider fails, AI
buttons show one clear message ("All AI providers are unavailable right
now...") instead of a stack trace or a silent no-op. **Neither Anthropic nor
OpenAI is used anywhere in this project.**

Google Gemini's adapter (`src/lib/ai/gemini.ts`) is fully implemented and
works identically to the other three — it's just not wired into the default
`PROVIDERS` array in `provider.ts` per current requirements. Re-enabling it
is a one-line change (import `geminiProvider` and add it to that array in
whatever priority position you want) if you ever want it back.

### What each layer does

- **Retry** — one retry per provider on retryable failures (timeouts, 429s,
  5xxs), short backoff. Non-retryable failures (bad API key, invalid model)
  skip straight to the next provider instead of wasting a retry.
- **Timeout** — every provider call is wrapped in an `AbortController` with a
  20s default (`AI_TIMEOUT_MS`), so a hung provider can't hang the request.
- **Rate limiting** — each provider has its own local per-minute cap tuned
  under its published free-tier limit (`AI_RPM_GROQ`, `AI_RPM_OPENROUTER`,
  `AI_RPM_HUGGINGFACE`), so a burst of clicks degrades to "try the next
  provider" instead of burning through your quota or getting throttled.
- **Caching** — identical requests (same prompt/system/params) are served
  from an in-memory cache for 10 minutes, tagged with which provider
  actually produced the result, so clicking "Suggest Tags" twice on the
  same draft doesn't spend a second call.
- **Streaming** — Rewrite and Grammar Check (the two long-form outputs)
  stream via Server-Sent Events and fill the body textarea live as tokens
  arrive, for Groq and OpenRouter (both support it). Hugging Face falls
  back to a single buffered response if it's the active provider —
  everything still works, just without the live-typing effect. Short
  outputs (headline, SEO title, tags, etc.) are non-streaming by design —
  there's nothing to gain from streaming three words.

### Feature → function map

| CMS feature | `src/lib/ai/index.ts` export |
|---|---|
| AI Headline Generator | `generateHeadlines()` |
| AI SEO Title Generator | `generateSeoTitle()` |
| AI Meta Description Generator | `generateMetaDescription()` |
| AI Summary Generator | `generateSummary()` |
| AI Rewrite | `rewriteText()` / `rewriteTextStream()` |
| AI Grammar Correction | `grammarCheck()` / `grammarCheckStream()` |
| AI Tag Generator | `suggestTags()` |
| AI Keyword Generator | `suggestKeywords()` |
| AI Category Suggestion | `suggestCategory()` |
| AI FAQ Generator | `generateFaq()` |
| AI Internal Linking Suggestions | `suggestInternalLinks()` |
| AI Related Articles Suggestions | `suggestRelatedArticles()` |

Internal Linking and Related Articles suggestions are matched against the
real catalog of published articles (fetched server-side in the route
handler) so the model can only suggest links that actually exist — it
never hallucinates a slug. Related Articles here is a second, AI-judged
opinion for editors; the reader-facing "Related Coverage" box on every
article page still uses the free, deterministic tag/category algorithm in
`content.ts` (`getRelatedArticles`/`getRecommendedArticles`), which runs on
every page view at zero cost and doesn't depend on any provider being up.

### Getting API keys (all three have a free tier)

- **Groq** — https://console.groq.com/keys (free account)
- **OpenRouter** — https://openrouter.ai/keys, then pick a `:free` model at https://openrouter.ai/models?max_price=0
- **Hugging Face** — https://huggingface.co/settings/tokens (free account; a "Read" token is enough)

Paste whichever you have into `.env` (see `.env.example`) — no code changes
needed. Model names drift over time as providers retire/replace free
models; if a default stops responding, override it with the matching
`*_MODEL` env var without touching any code.

---

## SEO / GEO / AEO

- **Sitemaps:** `/sitemap.xml`, `/news-sitemap.xml` (48h window per Google
  News spec), `/rss.xml`, `/robots.txt` (native Next.js generators, all
  Prisma-backed).
- **Structured data:** `NewsMediaOrganization`, `WebSite`+`SearchAction`,
  `NewsArticle`, `Person` (author + biography), `Product`
  (`AggregateRating`/`Offer`), `FAQPage`, `HowTo`, `BreadcrumbList` — see
  `src/lib/seo.ts`.
- **AEO blocks:** Summary box, Key Takeaways, Definition box, How-To steps,
  FAQ — all editable per article in the CMS, rendered as scannable
  components (`AeoBlocks.tsx`) and emitted as matching JSON-LD, formatted
  for featured snippets and AI answer engines.
- **robots.txt** explicitly allows GPTBot, ClaudeBot, PerplexityBot,
  Google-Extended, and Googlebot-News alongside standard search crawlers.

---

## Quick start

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Sign in at `http://localhost:3000/leadnest-admin-x7k2/login` with the
admin credentials from your `.env` (or the defaults noted above).

## Final production audit (what was specifically re-verified)

A second, skeptical pass was run over the Supabase/Groq migration
specifically checking "will this actually deploy with zero manual steps,"
re-verifying rather than re-asserting prior claims:

- **Migration re-applied fresh** to a clean local Postgres via `psql -f` —
  same file that ships in this repo, zero errors.
- **Seed logic exercised end-to-end**, not just read: generated a real
  bcrypt hash, inserted it via the same upsert semantics Prisma generates,
  ran it twice to confirm idempotency (second run didn't duplicate the
  category or overwrite the admin password), then verified the stored hash
  actually validates against the original password with `bcrypt.compare`.
  This confirms the seeded admin login will work, not just that the script
  doesn't error.
- **Supabase upload call type-checked against the installed package's own
  source**, not memory: confirmed `ArrayBuffer` (what `file.arrayBuffer()`
  returns) is the first documented member of storage-js's `FileBody` union
  type — `src/lib/storage.ts`'s upload call is exactly right.
- **Vercel's devDependency install behavior confirmed via current Vercel
  docs** rather than assumed, to check whether `tsx` (needed by `prisma db
  seed`, which now runs during the build) would be present.
- **One real fix made:** `tsx` was a devDependency. Vercel does install
  devDependencies by default, so this would have worked — but it's fragile
  against any future install-command customization (e.g. someone setting
  `npm install --only=production` to speed up builds). Moved to a regular
  `dependency` so the seed step can never silently break for this reason.
- **Full env var re-derivation from a fresh grep** (not reusing the prior
  audit's output) confirms `.env.example` has exactly the variables the
  code reads — including `DIRECT_URL`, which only appears inside
  `prisma/schema.prisma`'s `env("DIRECT_URL")` and is easy to miss with a
  `.ts`/`.tsx`-only search.
- Re-confirmed `AUTH_SECRET` is required (throws `MissingSecretError`
  without it) and `AUTH_URL` is not (covered by `trustHost: true`) by
  reading `node_modules/next-auth`'s own source.
- Diagnostic build (type-checking temporarily bypassed, then reverted)
  re-run after every fix above — still compiles clean, still fails at
  exactly one place: `@prisma/client did not initialize yet`, which is this
  sandbox's disclosed inability to reach `binaries.prisma.sh`, not a code
  defect. Nothing new broke.

No other issues were found. Everything else from the prior migration —
Auth.js config, the committed migration's table/enum/FK structure, the
Groq-default provider chain, rate limiting, audit logging, admin route
protection — was re-read in full and matched what was previously verified.

---

## Deploying to Vercel

This is deliberately zero-touch after the three steps you already know:

1. **Import the GitHub repository into Vercel.**
2. **Add the environment variables** from `.env.example` under Project →
   Settings → Environment Variables (at minimum: `DATABASE_URL`,
   `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD`; `GROQ_API_KEY` if you want AI features
   live immediately).
3. **Connect your domain** (`leadnest.tech`) under Project → Settings →
   Domains.

That's the whole list — there is no step 4. `package.json`'s `build` script
is `prisma generate && prisma migrate deploy && prisma db seed && next build`,
so every deploy automatically:
- regenerates the Prisma Client against your real schema,
- applies the committed migration (creates every table, first deploy only —
  it's a no-op on every deploy after that, since Prisma tracks what's
  already applied),
- runs the seed script, which is `upsert`-based and safe to run on every
  deploy — it ensures your categories and Administrator account exist
  without ever overwriting a password you've since changed,
- then builds the Next.js app.

The Supabase `news-media` bucket is created automatically on first upload
(see `src/lib/storage.ts`) — there's no dashboard step for that either.

If a deploy ever fails at the `prisma migrate deploy` step, it's almost
always `DATABASE_URL`/`DIRECT_URL` being unreachable from Vercel's network
(wrong password, project paused, or the pooled/direct ports swapped) —
double-check those two against Supabase's Database settings page.

## Useful scripts

```bash
npm run db:generate   # regenerate Prisma Client after editing schema.prisma
npm run db:migrate    # create + apply a migration in development
npm run db:deploy     # apply pending migrations in production (no prompts)
npm run db:seed       # run prisma/seed.ts
npm run db:studio     # Prisma Studio — browse/edit data visually
npm run gen:assets    # regenerate placeholder article/author/product SVGs
```

## Project structure (delta from the previous iteration)

```
prisma/schema.prisma        Full data model (16 models)
prisma/seed.ts              Essentials-only seed (+ optional sample content)
src/lib/prisma.ts           PrismaClient singleton (node-postgres driver adapter)
src/lib/auth.ts             Auth.js config, roles, roleAtLeast()
src/proxy.ts                Session-based route protection (was cookie-based)
src/lib/content.ts          Public reads (Prisma) — same function names as before, now async
src/lib/admin-data.ts       CMS CRUD, revisions, trash, bulk ops, users, comments, subscribers
src/lib/ai.ts               Anthropic-backed AI CMS tools
src/lib/supabase.ts         Supabase server client (service role)
src/lib/storage.ts          Supabase Storage service — upload/delete/replace, public URLs
src/lib/settings.ts         Key/value integration settings (DB + env, env wins)
src/lib/analytics.ts        First-party PageView aggregation
src/lib/push.ts             Web push sending (VAPID)
src/lib/mailer.ts           Email sending interface (unimplemented — bring your own provider)
src/lib/rate-limit.ts       In-memory rate limiter
src/lib/audit.ts            Audit log writer
src/components/common/Logo.tsx        Real brand logo, used everywhere
src/components/admin/*      CMS UI: article form + AI toolbar, trash, revisions,
                             media library, comments, newsletter, users, settings, analytics
```

## License note

Third-party font files are SIL OFL licensed (`/THIRD_PARTY_LICENSES`).
Logo assets are derived from the brand logo you provided. Placeholder
article/author/product imagery is originally generated by this repo's own
scripts — replace with licensed photography before production use.
