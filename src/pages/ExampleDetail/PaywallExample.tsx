// src/pages/ExampleDetail/PaywallExample.tsx
//
// The full-page layout of the paywall demo, rendered by the `example` route
// at /examples/paywall (see src/routes.tsx → ExampleDetail). The sections
// live in src/components/PaywallDemo.tsx; here each one gets a PageModule.
//
// One PaywallProvider sits above all four modules, so they share a single
// status: start the trial in module 2 and module 1 updates with it.
// PaywallProvider is a React context provider (no host element), so the
// PageModules remain direct children of DetailPage as the Dashboard requires
// (see the layout rule in SettingsExample.tsx).

import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import { PageModule } from "@stripe/ui-extension-sdk/ui";
import {
  GatedFeatureDemo,
  PAYWALL_DEMO_TITLES,
  PaywallLocalDemoBanner,
  PaywallPreviewDemo,
  PaywallStatusDemo,
  ResetTrialDemo,
} from "../../components/PaywallDemo";
import { PaywallProvider } from "../../hooks/usePaywall";

type PaywallExampleProps = {
  context: ExtensionContextValue;
};

export function PaywallExample({ context }: PaywallExampleProps) {
  return (
    <PaywallProvider context={context}>
      <PaywallLocalDemoBanner />

      <PageModule
        title={PAYWALL_DEMO_TITLES.status}
        subtitle="What the backend decided for this Stripe account, and why"
      >
        <PaywallStatusDemo />
      </PageModule>

      <PageModule
        title={PAYWALL_DEMO_TITLES.feature}
        subtitle="Wrapped in <Paywall>; the backend route checks again"
      >
        <GatedFeatureDemo context={context} />
      </PageModule>

      <PageModule
        title={PAYWALL_DEMO_TITLES.preview}
        subtitle="The same components, fed made-up data"
      >
        <PaywallPreviewDemo context={context} />
      </PageModule>

      <PageModule
        title={PAYWALL_DEMO_TITLES.reset}
        subtitle="Development only"
      >
        <ResetTrialDemo />
      </PageModule>
    </PaywallProvider>
  );
}
