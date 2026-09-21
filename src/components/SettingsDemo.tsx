// src/components/SettingsDemo.tsx
//
// ============================================================================
//  App settings demo — user-scoped, account-scoped and per-mode settings
// ============================================================================
//
// The demo sections, shared by the drawer (src/views/App.tsx) and the
// full-page route /examples/app-settings
// (src/pages/ExampleDetail/SettingsExample.tsx) — same split as
// BackendDemo.tsx: each section renders controls and results but no heading,
// so the drawer can wrap them in plain headings and the full-page view in
// PageModules.
//
// Every control writes through the useSettings hook (src/hooks/useSettings.tsx)
// to the backend's /api/stripe-app/settings route, which stores the value in
// the table the setting's scope names:
//
//   account scope   account_settings — shared by everyone who uses the app
//                   in this Stripe account
//   user scope      user_settings — this Dashboard user's own preferences
//
// Who you are is the signed request itself: fetchStripeSignature() vouches
// for the Stripe account and Dashboard user ids, so settings work from the
// first request after installation with no login step. Both tables keep
// one row per mode, so everything you set in test mode is separate from
// live mode — flip the Dashboard's mode toggle and the demo shows the other
// set. The developer decides which scope a setting has in one place —
// src/types/settings.ts — and the same file gives the backend its
// validation rules.
//
// MergedSettingsDemo shows the result and where each value came from
// (default, account or user), which is the point of the pattern: the rest
// of the app reads one flat `settings` object and never cares which table a
// value lives in.
// ============================================================================

import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import {
  Badge,
  Banner,
  Box,
  Button,
  Icon,
  Inline,
  PropertyList,
  PropertyListItem,
  Radio,
  Spinner,
  Switch,
  TextField,
  Tooltip,
} from "@stripe/ui-extension-sdk/ui";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { SettingsProvider, useSettings } from "../hooks/useSettings";
import {
  resetPatch,
  SETTING_DEFINITIONS,
  SETTING_KEYS,
  type SettingKey,
} from "../types/settings";

const TEXT_SAVE_DELAY_MS = 600;

const SETTING_LABELS: Record<SettingKey, string> = {
  companyName: "Company name",
  customerNotifications: "Customer notifications",
  labelSize: "Label size",
  printPackingSlips: "Print packing slips",
};

/** Titles shared by both layouts, so the drawer and the page read the same. */
export const SETTINGS_DEMO_TITLES = {
  account: "Account settings",
  user: "Your settings",
  merged: "What the app reads",
} as const;

export const SettingsLocalDemoBanner = () => (
  <Banner
    type="default"
    title="Local demo"
    description="Start the backend first: npm run dev in stripe-app-nextjs-backend (localhost:3006). No login needed — the signed request identifies you."
  />
);

// ---------------------------------------------------------------------------
//  Small pieces
// ---------------------------------------------------------------------------

/** Which mode's rows are being edited. Shown once, above the sections. */
export const ModeNotice = () => {
  const { mode } = useSettings();
  return (
    <Box css={{ stack: "x", gap: "small", alignY: "center" }}>
      <Badge type={mode === "live" ? "warning" : "info"}>{mode} mode</Badge>
      <Inline css={{ font: "caption", color: "secondary" }}>
        Every setting below is stored per mode. Toggle the Dashboard&apos;s
        test mode to see the other set.
      </Inline>
    </Box>
  );
};

/** "Saving…", "Saved", or the error from the last save. */
export const SaveIndicator = () => {
  const { saveStatus, saveError } = useSettings();
  switch (saveStatus) {
    case "saving":
      return (
        <Box css={{ stack: "x", gap: "small", alignY: "center" }}>
          <Spinner size="small" />
          <Inline css={{ font: "caption", color: "secondary" }}>Saving…</Inline>
        </Box>
      );
    case "saved":
      return (
        <Box>
          <Badge type="positive">Saved</Badge>
        </Box>
      );
    case "error":
      return (
        <Banner
          type="critical"
          title="Couldn't save"
          description={saveError?.message ?? "Unknown error"}
        />
      );
    default:
      return null;
  }
};

const ScopeBadge = ({ scope }: { scope: "user" | "account" | "default" }) => (
  <Badge type={scope === "account" ? "info" : scope === "user" ? "positive" : "neutral"}>
    {scope}
  </Badge>
);

type SettingTypeInfoTagProps = {
  type: "user" | "account";
  /** "Optional" vs "Required" in the badge text. */
  isOptional?: boolean;
};

/**
 * Badge + tooltip that tells the user whether a group of settings is theirs
 * alone or shared with everyone in the Stripe account. Adapted from
 * Parcelcraft's SettingTypeInfoTag (its "company" is our "account").
 */
export const SettingTypeInfoTag = ({
  type,
  isOptional = true,
}: SettingTypeInfoTagProps) => {
  const title = `${isOptional ? "Optional" : "Required"} ${type} settings`;
  const explanation =
    type === "user"
      ? "This section's settings apply only to you and do not affect anyone else in your Stripe account."
      : "Everyone who uses this app in your Stripe account shares the options you set here.";

  return (
    <Box>
      <Tooltip
        delay={0}
        placement="left"
        trigger={
          <Box css={{ stack: "x", alignY: "center", gap: "small" }}>
            <Badge type={type === "account" ? "info" : "positive"}>{title}</Badge>
            <Icon name="help" size="xsmall" />
          </Box>
        }
      >
        <Inline css={{ font: "caption" }}>{explanation}</Inline>
      </Tooltip>
    </Box>
  );
};

/** Spinner while loading, the error if loading failed, otherwise the children. */
const WhenLoaded = ({ children }: { children: ReactNode }) => {
  const { status, error } = useSettings();
  if (status === "loading") return <Spinner size="small" />;
  if (status === "error") {
    return (
      <Box css={{ stack: "y", gap: "xsmall" }}>
        <Banner
          type="critical"
          title="Couldn't load settings"
          description={error?.message ?? "Unknown error"}
        />
        {error?.hint && (
          <Box css={{ font: "caption", color: "secondary" }}>💡 {error.hint}</Box>
        )}
      </Box>
    );
  }
  return <>{children}</>;
};

// ---------------------------------------------------------------------------
//  The sections
// ---------------------------------------------------------------------------

export type SettingsDemoProps = {
  context: ExtensionContextValue;
  children: ReactNode;
};

/**
 * SettingsProvider plus the mode notice and save indicator, for layouts that
 * allow a Box around the sections (the drawer). The full page composes the
 * same pieces itself because PageModule must sit directly under DetailPage.
 */
export function SettingsDemoProvider({ context, children }: SettingsDemoProps) {
  return (
    <SettingsProvider context={context}>
      <Box css={{ stack: "y", gap: "medium" }}>
        <ModeNotice />
        <SaveIndicator />
        {children}
      </Box>
    </SettingsProvider>
  );
}

/** Account scope: shared by everyone who uses the app in this Stripe account. */
export function AccountSettingsDemo() {
  const { settings, updateAccountSettings } = useSettings();

  // Text input: UNCONTROLLED (defaultValue), saved after the user pauses
  // typing. A controlled TextField (value + onChange) drops keystrokes in a
  // Stripe App: every keystroke round-trips through the remote-ui bridge
  // before the `value` prop comes back, and the host resets the input to
  // the stale value in between. Click-driven controls (Switch, Radio) are
  // fine controlled — they change once per click, not per keystroke.
  //
  // To still reflect a value that changed on the backend (a reset, another
  // tab's save), the field is remounted with the new default via `key`,
  // but only while the user isn't mid-edit here.
  const typing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const lastSaved = useRef(settings.companyName);
  const [fieldKey, setFieldKey] = useState(0);
  useEffect(() => {
    if (!typing.current && settings.companyName !== lastSaved.current) {
      lastSaved.current = settings.companyName;
      setFieldKey((key) => key + 1);
    }
  }, [settings.companyName]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onCompanyNameChange = useCallback(
    (value: string) => {
      typing.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        typing.current = false;
        lastSaved.current = value.trim();
        // Empty string → null: forget the stored value, the default applies.
        updateAccountSettings({ companyName: value.trim() || null });
      }, TEXT_SAVE_DELAY_MS);
    },
    [updateAccountSettings],
  );

  return (
    <WhenLoaded>
      <Box css={{ stack: "y", gap: "medium" }}>
        <Box css={{ stack: "x", gap: "small", alignY: "center" }}>
          <SettingTypeInfoTag type="account" />
          <Inline css={{ font: "caption", color: "secondary" }}>
            account_settings table
          </Inline>
        </Box>

        <TextField
          key={fieldKey}
          label="Company name"
          description="Printed on documents the app generates."
          defaultValue={settings.companyName}
          onChange={(event) => onCompanyNameChange(event.target.value)}
        />

        <Switch
          label="Send customer notifications"
          description="Leave this off in test mode: the live-mode row has its own value."
          checked={settings.customerNotifications}
          onChange={(event) =>
            updateAccountSettings({ customerNotifications: event.target.checked })
          }
        />
      </Box>
    </WhenLoaded>
  );
}

/** User scope: this Dashboard user's own preferences. */
export function UserSettingsDemo() {
  const { settings, updateUserSettings } = useSettings();

  return (
    <WhenLoaded>
      <Box css={{ stack: "y", gap: "medium" }}>
        <Box css={{ stack: "x", gap: "small", alignY: "center" }}>
          <SettingTypeInfoTag type="user" />
          <Inline css={{ font: "caption", color: "secondary" }}>
            user_settings table
          </Inline>
        </Box>

        <Box css={{ stack: "y", gap: "xsmall" }}>
          <Inline css={{ fontWeight: "semibold" }}>Label size</Inline>
          <Radio
            name="labelSize"
            value="4x6"
            label='4 x 6" labels'
            description="Recommended"
            checked={settings.labelSize === "4x6"}
            onChange={() => updateUserSettings({ labelSize: "4x6" })}
          />
          <Radio
            name="labelSize"
            value="8.5x11"
            label='8.5 x 11" sheets'
            checked={settings.labelSize === "8.5x11"}
            onChange={() => updateUserSettings({ labelSize: "8.5x11" })}
          />
        </Box>

        <Switch
          label="Print packing slips"
          description="Add a packing slip to every label you print."
          checked={settings.printPackingSlips}
          onChange={(event) =>
            updateUserSettings({ printPackingSlips: event.target.checked })
          }
        />
      </Box>
    </WhenLoaded>
  );
}

/** The merged object the rest of the app reads, with each value's source. */
export function MergedSettingsDemo() {
  const { settings, account, user, updateUserSettings, updateAccountSettings } =
    useSettings();

  return (
    <WhenLoaded>
      <Box css={{ stack: "y", gap: "medium" }}>
        <PropertyList>
          {SETTING_KEYS.map((key) => {
            const definition = SETTING_DEFINITIONS[key];
            const source =
              definition.scope === "user"
                ? key in user
                  ? "user"
                  : "default"
                : key in account
                  ? "account"
                  : "default";
            return (
              <PropertyListItem
                key={key}
                label={SETTING_LABELS[key]}
                value={
                  <Box css={{ stack: "x", gap: "small", alignY: "center", wrap: "wrap" }}>
                    <Inline>{String(settings[key]) || "(empty)"}</Inline>
                    <ScopeBadge scope={source} />
                  </Box>
                }
              />
            );
          })}
        </PropertyList>

        <Box css={{ stack: "x", gap: "small", wrap: "wrap" }}>
          <Button onPress={() => updateUserSettings(resetPatch("user"))}>
            Reset your settings
          </Button>
          <Button onPress={() => updateAccountSettings(resetPatch("account"))}>
            Reset account settings
          </Button>
        </Box>
        <Box css={{ font: "caption", color: "secondary" }}>
          Reset sends null for each key. The backend deletes the stored value
          and the default from src/types/settings.ts applies again.
        </Box>
      </Box>
    </WhenLoaded>
  );
}
