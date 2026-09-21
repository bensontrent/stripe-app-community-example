// src/routes.tsx
//
// ============================================================================
//  Route config — the single place that maps URLs to views
// ============================================================================
//
// A full-page app owns the path after its base URL:
//
//   https://dashboard.stripe.com/<ACCOUNT>/app/<APP_ID>/examples/authentication
//                                                     └────────────────────────┘
//
// Everything else in the app navigates by route *name* (`key`), never by raw
// path, so a pattern can change here without touching the call sites:
//
//   createAppRoute({ key: "example", params: { slug: "authentication" } })
//   navigateToAppRoute({ key: "customer", params: { customerId } })
//
// Patterns in use:
//   /:tabId?                                  optional parameter (Home tabs)
//   /examples/:slug                           required parameter
//   /customers/:customerId                    list → detail
//   /customers/:customerId/invoices/:invoiceId  two nested parameters
//   /demo/:slug                               Redirect from a retired path
//
// Note that `/:tabId?` also matches any other single-segment URL ("/whatever"),
// so Home validates the tab and redirects unknown values (see pages/Home).
// Paths with more segments that match nothing fall through to AppRouter's
// `redirectOnNotFound` in views/FullPage.tsx.
//
// The `RouteRegister` declaration at the bottom is what makes every
// navigation call type-checked: an unknown key or a missing parameter is a
// compile error, not a broken link.
// ============================================================================

import {
  createRoutes,
  Redirect,
  route,
} from "@stripe/ui-extension-sdk/navigation";

import { CustomerDetail } from "./pages/CustomerDetail";
import { ExampleDetail } from "./pages/ExampleDetail";
import { Home } from "./pages/Home";
import { InvoiceDetail } from "./pages/InvoiceDetail";

export const routes = createRoutes({
  // The render function receives the matched params and the view's
  // ExtensionContextValue (user, account, mode, viewport, ...).
  home: route("/:tabId?", (_params, context) => <Home context={context} />),

  example: route("/examples/:slug", ({ slug }, context) => (
    <ExampleDetail slug={slug} context={context} />
  )),

  customer: route("/customers/:customerId", ({ customerId }) => (
    <CustomerDetail customerId={customerId} />
  )),

  invoice: route(
    "/customers/:customerId/invoices/:invoiceId",
    ({ customerId, invoiceId }) => (
      <InvoiceDetail customerId={customerId} invoiceId={invoiceId} />
    ),
  ),

  // Retired path. Once a URL has shipped in a published version, keep a
  // Redirect for it: users bookmark and share Dashboard links. `Redirect`
  // replaces the history entry, so the back button never lands on it.
  legacyDemo: route("/demo/:slug", ({ slug }) => (
    <Redirect route={{ key: "example", params: { slug } }} />
  )),
});

declare module "@stripe/ui-extension-sdk/navigation" {
  interface RouteRegister {
    routes: typeof routes;
  }
}
