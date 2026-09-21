// src/pages/ExampleDetail/AuthenticationExample.tsx
//
// The full-page mirror of the drawer (src/views/App.tsx), rendered at
// /examples/authentication. Same three demo sections from
// src/components/BackendDemo.tsx, laid out as PageModules instead of a
// ContextView. Having a URL for the demo means it can be bookmarked and
// linked to (the Overview tab and the FullPageView page action both do).

import { PageModule } from "@stripe/ui-extension-sdk/ui";
import {
  BACKEND_DEMO_TITLES,
  type BackendDemoProps,
  LocalDemoBanner,
  LoginDemo,
  SignedRequestDemo,
  UrlTokenDemo,
} from "../../components/BackendDemo";

export function AuthenticationExample({ context }: BackendDemoProps) {
  return (
    <>
      <LocalDemoBanner />

      <PageModule
        title={BACKEND_DEMO_TITLES.signedRequest}
        subtitle="fetchStripeSignature() proves the request came from this app"
      >
        <SignedRequestDemo context={context} />
      </PageModule>

      <PageModule
        title={BACKEND_DEMO_TITLES.urlToken}
        subtitle="A short-lived token in the query string"
      >
        <UrlTokenDemo context={context} />
      </PageModule>

      <PageModule
        title={BACKEND_DEMO_TITLES.login}
        subtitle="Browser-tab handshake with Better Auth"
      >
        <LoginDemo context={context} />
      </PageModule>
    </>
  );
}
