// src/examples/catalog.ts
//
// The examples this app links to, one per major feature. Pages look entries
// up by `slug`, and the `example` route renders `/examples/:slug`, so a slug
// is effectively part of the app's public URL space. Renaming one means
// adding a Redirect for the old value in src/routes.tsx so bookmarks keep
// working. The demo component for each slug is registered in
// src/pages/ExampleDetail/index.tsx (EXAMPLE_DEMOS).

export type Example = {
  /** URL segment: /examples/<slug>. Lowercase letters and hyphens only. */
  slug: string;
  title: string;
  summary: string;
  /** Where the demo's sections live, relative to the repo root. */
  source: string;
};

export const EXAMPLES = [
  {
    slug: "authentication",
    title: "Backend authentication",
    summary:
      "Signed requests, self-authenticating links and Dashboard user login against the companion Next.js backend.",
    source: "stripe-app/src/components/BackendDemo.tsx",
  },
  {
    slug: "app-settings",
    title: "App settings",
    summary:
      "User-scoped, account-wide and per-mode settings: one useSettings hook, two tables keyed by livemode, no cache.",
    source: "stripe-app/src/components/SettingsDemo.tsx",
  },
  {
    slug: "paywall",
    title: "Paywall and free trial",
    summary:
      "Monetize the app: a per-account free trial limited by days and by usage, a subscription check, and a feature gated on the backend. Test mode stays free.",
    source: "stripe-app/src/components/PaywallDemo.tsx",
  },
] as const;
// (`satisfies readonly Example[]` would be the idiomatic check, but the Stripe
// CLI's bundler doesn't parse it yet; the typed return below enforces the
// same thing.)

export type ExampleSlug = (typeof EXAMPLES)[number]["slug"];

export const findExample = (slug: string): Example | undefined =>
  EXAMPLES.find((example) => example.slug === slug);
