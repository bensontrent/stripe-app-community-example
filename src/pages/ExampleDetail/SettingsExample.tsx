// src/pages/ExampleDetail/SettingsExample.tsx
//
// The full-page layout of the app settings demo, rendered by the `example`
// route at /examples/app-settings (see src/routes.tsx → ExampleDetail). The
// sections themselves live in src/components/SettingsDemo.tsx and are
// shared with the drawer (src/views/App.tsx); here each one gets a
// PageModule.
//
// Layout rule learned the hard way: the Dashboard only accepts PageModule
// as a direct child of DetailPage / OverviewPage — wrapping the modules in
// a Box is a runtime error. SettingsProvider is a React context provider
// (no host element), so it can sit above the modules.

import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import { Box, PageModule } from "@stripe/ui-extension-sdk/ui";
import {
  AccountSettingsDemo,
  MergedSettingsDemo,
  ModeNotice,
  SaveIndicator,
  SETTINGS_DEMO_TITLES,
  SettingsLocalDemoBanner,
  UserSettingsDemo,
} from "../../components/SettingsDemo";
import { SettingsProvider } from "../../hooks/useSettings";

type SettingsExampleProps = {
  context: ExtensionContextValue;
};

export function SettingsExample({ context }: SettingsExampleProps) {
  return (
    <SettingsProvider context={context}>
      <SettingsLocalDemoBanner />

      <Box css={{ stack: "y", gap: "small" }}>
        <ModeNotice />
        <SaveIndicator />
      </Box>

      <PageModule
        title={SETTINGS_DEMO_TITLES.account}
        subtitle="Shared by everyone who uses this app in this Stripe account"
      >
        <AccountSettingsDemo />
      </PageModule>

      <PageModule
        title={SETTINGS_DEMO_TITLES.user}
        subtitle="Only you see these; other users of this account have their own"
      >
        <UserSettingsDemo />
      </PageModule>

      <PageModule
        title={SETTINGS_DEMO_TITLES.merged}
        subtitle="One flat settings object, and where each value came from"
      >
        <MergedSettingsDemo />
      </PageModule>
    </SettingsProvider>
  );
}
