# Community Example — Stripe App (UI extension)

> 🤓👓 **Not an official Stripe publication.** Community-maintained example
> from the Stripe Apps Developer meetup. Steal this code freely.

A Stripe App with a **full-page view** in the Stripe Dashboard, routed with
`@stripe/ui-extension-sdk/navigation`, plus a drawer (`App.tsx`) that lists the examples and opens each one in the
full-page app. Every example has its own Dashboard URL that can be bookmarked
and shared.

| View | Viewport | File |
| --- | --- | --- |
| Full-page app | `stripe.dashboard.fullpage` | [`src/views/FullPage.tsx`](src/views/FullPage.tsx) |
| Drawer | `stripe.dashboard.drawer.default` | [`src/views/App.tsx`](src/views/App.tsx) |

## 🤖 Start your own app with an AI agent

This app is one half of
[stripe-apps-community-examples](https://github.com/bensontrent/stripe-apps-community-examples);
the other half is its Next.js backend. Both are written to be read by AI coding
agents as much as by people: copy the prompt below into Claude Code, Cursor,
Codex or any agent that can run commands, **in an empty folder**. The agent
studies the example, asks what you want to build, proposes a plan, and only
then builds your backend and Stripe App from the working code. Already know
what you're building? Add a sentence or two about it at the end.

```text
I want to build a Stripe App with its own backend, and I want you to start from a
working example instead of from scratch:

https://github.com/bensontrent/stripe-apps-community-examples

It contains a Next.js backend (stripe-app-nextjs-backend/: Better Auth, Supabase
Postgres, Stripe webhooks, signed requests from the app) and a Stripe App UI extension
(stripe-app/, a git submodule of
https://github.com/bensontrent/stripe-app-community-example, so clone with
--recurse-submodules or that folder will be empty).

Please work in this order:

1. Read first. Clone the example into a temporary folder outside my project and read
   README.md, AGENTS.md, stripe-app/README.md, and in stripe-app-nextjs-backend/:
   AGENTS.md (the rules for changing the backend), AUTHENTICATION.md, ARCHITECTURE.md,
   setup.sql plus migrations/ (the database schema) and the guides in
   src/content/docs/. The roadmap in README.md shows which features have a working
   example and which don't yet.

2. Interview me before writing any code. Ask a few questions at a time in plain
   language and wait for my answers. If I'm unsure, recommend an option and say why.
   Find out:
   - what the app does, who it's for, and what the first version must do to be useful
   - whether it's for the Stripe App Marketplace (installed by many Stripe accounts)
     or a private app for one company
   - where it shows up in the Dashboard (full page, a drawer on customer, invoice or
     payment pages, a settings view) and which Stripe data it reads or changes
   - what the backend has to do: data to store, outside services to call, webhooks to
     react to, scheduled jobs
   - whether users need an account on my site, and whether I'll charge for the app
     (free, free trial, subscription)
   - the app's name, and what I already have set up (Stripe account, Stripe CLI,
     Supabase, hosting)

3. Propose a plan and wait for my go-ahead. List the features of the first version and
   mark each one as kept from the example, adapted, or new. List what you'll remove,
   the Stripe permissions the app will request, the database tables, and the steps
   only I can do. Tell me plainly when something I asked for has no example to build
   on, so I know it's new work and not proven code.

4. Build it as a new project in this folder with its own git history (not a fork, no
   submodule), keeping the example's two-folder layout. Copy the example's code and
   adapt it: the authentication between the app and the backend and the per-account
   data model are the hard part, and they already work.
   - Follow the "Non-negotiables" in stripe-app-nextjs-backend/AGENTS.md.
   - Give the app its own id and name in stripe-app.json (ids are unique across all of
     Stripe), request only the permissions the features need, and remove the demo
     pages, mock data and features I'm not using.
   - Build the UI only from @stripe/ui-extension-sdk components, and check
     https://docs.stripe.com/stripe-apps when unsure instead of guessing: plain HTML
     elements and CSS files aren't available inside the Dashboard.
   - Database changes go in stripe-app-nextjs-backend/migrations/ as new timestamped
     .sql files (rules in its README.md; npm run db:setup applies them). Don't edit
     setup.sql: it is the example's baseline schema.
   - Use Stripe test mode only. Never ask me to paste secrets into this chat: when a
     step needs my credentials or an interactive terminal (stripe login, npm run
     setup, stripe apps upload, copying the signing secret), tell me the exact command
     and where to run it. Ask before anything that creates cloud resources or costs
     money.

5. Check your work: npm run build in the backend, npm test and npm run typecheck in
   the app. Tell me what you verified and what you couldn't (anything that needs a
   real Stripe Dashboard).

6. Hand over: replace the example's README.md and AGENTS.md with ones that describe my
   project, and give me a short checklist to get it running locally, upload the app
   and deploy the backend.

Start with step 1, then ask me your first questions.
```

The steps only you can do stay with you: logging in to Stripe, connecting your
database (`npm run setup` in the backend) and the first `stripe apps upload`.

## Routes

Defined once in [`src/routes.tsx`](src/routes.tsx); everything else navigates
by route *name*, never by path.

| Route | Pattern | What it shows |
| --- | --- | --- |
| `home` | `/:tabId?` | Tabs **Examples** and **Routing**. The selected tab is the optional URL segment (`/` is the default tab). Unknown values redirect home. |
| `example` | `/examples/:slug` | One of the examples in [`src/examples/catalog.ts`](src/examples/catalog.ts): `authentication` (backend auth), `app-settings` or `paywall`. |
| `customer` | `/customers/:customerId` | List-to-detail flow over mock data with a `DataTable` of invoices. Unknown ids hand over to the native Dashboard page with a route descriptor. |
| `invoice` | `/customers/:customerId/invoices/:invoiceId` | Two nested parameters, breadcrumbs back up the hierarchy, previous/next links. |
| `legacyDemo` | `/demo/:slug` | A retired path kept alive with `<Redirect>`. |

The **Routing** tab is a playground for the navigation APIs: `useAppRoute`,
`useAllSearchParams` (replace vs. push), `useSearchParam`, `createAppRoute`
(links, breadcrumbs, links with search params preset), `navigateToAppRoute`,
Dashboard route descriptors and `navigateToDashboardRoute`, and keeps its own
UI state in the URL (`?app[sort]=newest`).

## The backend authentication example

`/examples/authentication` ([`AuthenticationExample.tsx`](src/pages/ExampleDetail/AuthenticationExample.tsx),
sections in [`src/components/BackendDemo.tsx`](src/components/BackendDemo.tsx))
demonstrates the client side of three auth patterns against the companion
Next.js backend:

1. **Signed requests** — every fetch carries a `stripe-signature` header from
   `fetchStripeSignature()`; the backend verifies it against the app's signing
   secret, so no login or API key is needed ("Verify connection").
2. **JWT-in-URL tokens** — exchange a signed request for a short-lived link
   that authenticates itself via its query string ("Create download link").
3. **User login from the Dashboard** — a browser-tab handshake links the
   Dashboard user to a Better Auth account on the backend (`Login.tsx`).

## The app settings example

`/examples/app-settings` ([`SettingsExample.tsx`](src/pages/ExampleDetail/SettingsExample.tsx))
shows how to store settings that are **account-wide** (shared by everyone
in the Stripe account), **user-specific**, or **split by test/live mode**,
with one hook:

```tsx
const { settings, updateUserSettings, updateAccountSettings } = useSettings();
```

- [`src/types/settings.ts`](src/types/settings.ts) is the whole model — the
  `AccountSettings` / `UserSettings` types, defaults, and a map that says
  which scope each key lives in. The backend keeps an identical copy and
  validates every write against it.
- [`src/hooks/useSettings.tsx`](src/hooks/useSettings.tsx) fetches both
  layers once per view, merges them over the defaults, and applies updates
  optimistically. `updateUserSettings` and `updateAccountSettings` are typed
  per scope, so a key can't be sent to the wrong table.
- The backend merges patches inside Postgres (`settings_merge` in
  `setup.sql`), so overlapping saves never overwrite each other — and there
  is no server-side cache to invalidate.

Settings belong to a logged-in app user, so the demo sits inside the
`Login` component. Backend docs: [App settings](https://github.com/bensontrent/stripe-apps-community-examples/blob/main/stripe-app-nextjs-backend/src/content/docs/app-settings.md).

The backend is
[`stripe-app-nextjs-backend`](https://github.com/bensontrent/stripe-apps-community-examples/tree/main/stripe-app-nextjs-backend)
— a Stripe Projects build template you can scaffold with one command:

```bash
stripe projects build my-stripe-app-backend --template bensontrent/stripe-app-nextjs-backend
```

## Requirements

- Node.js 18+ (20+ recommended)
- [Stripe CLI](https://docs.stripe.com/stripe-cli) with the Stripe Apps plugin:
  `stripe plugin install apps` (full-page apps need a recent plugin; run
  `stripe plugin upgrade apps` if the preview doesn't show the page)
- `@stripe/ui-extension-sdk` 9.2.1+ (this app pins 9.3.0)
- The backend running locally for the authentication example
  (`npm run dev` in `stripe-app-nextjs-backend`, port 3006)

## Run it

```bash
npm install
stripe login
stripe apps start
```

`stripe apps start` opens the Stripe Dashboard with the app previewed. Open the
app from the Dashboard's app menu: the drawer lists the examples and has an "Open the full-page app"
button, or go straight to `https://dashboard.stripe.com/<ACCOUNT>/app/<APP_ID>/`.
Watch the address bar as you click around: every tab, filter and detail page
is a URL. The backend URL is `http://localhost:3006` in development
(`src/api/backend.ts`); previews may fetch `localhost` without a CSP entry.

## Tests

```bash
npm test
npm run typecheck
```

Routed views need the Dashboard's router, which nothing provides under Jest.
[`src/testing/mockRouter.ts`](src/testing/mockRouter.ts) installs an in-memory
implementation of the same interface (`globalThis.__extRouter`) so the tests in
[`src/views/FullPage.test.tsx`](src/views/FullPage.test.tsx) can render the real
`FullPage` view, change tabs and filters, and assert on what the URL becomes.

## Before your first upload: rename the app

This example ships with the app ID `com.productivity.community-example`.
**Stripe App IDs are globally unique across all of Stripe** — once an ID has
been uploaded by one account, nobody else can upload an app with that ID.
Local previewing works with the ID as-is, but before `stripe apps upload`:

1. In [`stripe-app.json`](stripe-app.json), change `id` to something you own,
   reverse-domain style (e.g. `com.yourcompany.your-app-name`). You can also
   change the display `name` (it's the full-page view's header).
2. Keep [`package.json`](package.json)'s `name` in sync (convention, not required).

Changing the `id` after installing a preview means Stripe treats it as a
brand-new app — install the new one and uninstall the old.

## Upload early — you need it for the signing secret

Signed requests verify against your app's **signing secret**, which only
exists after you run `stripe apps upload` once. Until then
`fetchStripeSignature()` fails with `No such app: <your-app-id>`. After
uploading, copy the "Signing secret" from your app's settings page in the
Developers Dashboard into `STRIPE_APP_SIGNING_SECRET` in the backend's
`.env.local`.

**Uploading is not publishing.** An uploaded app is visible only to your own
Stripe account. Making it public means separately submitting it for review
and building a Marketplace listing. Upload freely during development.

## Pointing at a deployed backend

1. `src/api/backend.ts` → `BACKEND_BASE = 'https://your-backend.example.com'`
2. `stripe-app.json` → `content_security_policy.connect-src` must list
   `https://your-backend.example.com/api/` (published apps can only reach
   listed URLs)
3. `stripe apps upload`

## Structure

```
stripe-app/
├── stripe-app.json              # App manifest: id, views (fullpage + drawer), CSP
├── src/
│   ├── routes.tsx               # Route config + RouteRegister (type-safe navigation)
│   ├── views/
│   │   ├── FullPage.tsx         # stripe.dashboard.fullpage → AppRouter
│   │   └── App.tsx              # stripe.dashboard.drawer.default → list of examples, links into routes
│   ├── providers/withNavigation.tsx  # Shared NavigationProvider for every view
│   ├── pages/
│   │   ├── Home/                # /:tabId? — Examples and Routing tabs
│   │   ├── ExampleDetail/       # /examples/:slug (+ AuthenticationExample.tsx)
│   │   ├── CustomerDetail/      # /customers/:customerId
│   │   └── InvoiceDetail/       # /customers/:customerId/invoices/:invoiceId
│   ├── examples/catalog.ts      # The two examples (slug → title, summary, source)
│   ├── data/mock.ts             # Mock customers/invoices for the nested-route demo
│   ├── components/
│   │   ├── BackendDemo.tsx      # The three auth demo sections
│   │   ├── SettingsDemo.tsx     # The app settings demo sections
│   │   ├── Paywall.tsx          # <Paywall>: the paid feature, or the trial / upgrade view
│   │   ├── PaywallDemo.tsx      # The paywall demo sections (/examples/paywall)
│   │   ├── Login.tsx            # Dashboard-user login state machine
│   │   └── Form.tsx
│   ├── api/backend.ts           # Signed-fetch client + example calls
│   ├── testing/mockRouter.ts    # In-memory ExtensionRouter for Jest
│   └── events.ts
└── app_icon.png
```

## Scripts

| Script | What it does |
|---|---|
| `npm start` | `stripe apps start` — preview in the Dashboard |
| `npm run upload` | `stripe apps upload` |
| `npm run login` | `stripe login` |
| `npm test` | Jest |
| `npm run typecheck` | `tsc --noEmit` |

## Learn more

- [Stripe Apps docs](https://docs.stripe.com/stripe-apps)
- [Routing](https://docs.stripe.com/stripe-apps/routing) and
  [full-page apps](https://docs.stripe.com/stripe-apps/patterns/full-page-apps)
- [Route descriptors](https://docs.stripe.com/stripe-apps/route-descriptors)
- [Stripe UI Extension SDK](https://docs.stripe.com/stripe-apps/ui)
- Backend docs: [AUTHENTICATION.md](https://github.com/bensontrent/stripe-apps-community-examples/blob/main/stripe-app-nextjs-backend/AUTHENTICATION.md)

## License

MIT — see [LICENSE](LICENSE).
