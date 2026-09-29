// src/components/PaywallDemo.tsx
//
// ============================================================================
//  Paywall demo — free trial, subscription check, and a gated feature
// ============================================================================
//
// The demo sections of /examples/paywall
// (src/pages/ExampleDetail/PaywallExample.tsx). Same split as
// SettingsDemo.tsx: each section renders controls and results but no
// heading, and the page wraps each one in a PageModule. All of them read the
// same usePaywall() state, so they must sit under one <PaywallProvider>.
//
//   PaywallStatusDemo    what the backend decided for this Stripe account,
//                        and why: GET /api/stripe-app/paywall
//   GatedFeatureDemo     a paid feature behind <Paywall>. "Create a widget"
//                        calls the gated backend route; during a trial each
//                        press uses up one of TRIAL_COUNT_LIMIT, and when
//                        the allowance is gone the feature is replaced by
//                        the upgrade steps.
//   PaywallPreviewDemo   every state the paywall can be in, rendered from
//                        made-up data — what your users see, without having
//                        to wait 30 days to see it
//   ResetTrialDemo       development only: forget the trial and start over
//
// The rules (from the backend's src/lib/paywall.ts):
//
//   • The trial belongs to the STRIPE ACCOUNT: everyone in the account
//     shares one trial clock and one allowance.
//   • TEST MODE IS FREE. The paywall only applies in live mode, so this
//     demo shows "access granted: test mode" in a normal test-mode preview.
//     To walk through the real flow locally, set
//     PAYWALL_ENFORCE_IN_TEST_MODE=true in the backend's .env.local and
//     restart it.
//   • The limits are backend configuration: TRIAL_DAYS_LIMIT and
//     TRIAL_COUNT_LIMIT. The app never hard-codes them; it shows what the
//     backend sends.
// ============================================================================

import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import {
  Badge,
  Banner,
  Box,
  Button,
  Inline,
  PropertyList,
  PropertyListItem,
  Select,
  Spinner,
} from "@stripe/ui-extension-sdk/ui";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { usePaywall } from "../hooks/usePaywall";
import {
  resolvePaywall,
  type AccessReason,
  type PaywallInput,
  type PaywallLimits,
  type PaywallStatus,
} from "../types/paywall";
import Paywall, {
  formatDate,
  PaywallGate,
  PlansLink,
  RecheckResult,
} from "./Paywall";

/** What one use of the demo's paid feature is called. */
const UNIT = "widget";

/** Titles shared with the page layout (and asserted on in the tests). */
export const PAYWALL_DEMO_TITLES = {
  status: "1. Paywall status",
  feature: "2. A paid feature",
  preview: "3. Preview every state",
  reset: "4. Start over",
} as const;

export const PaywallLocalDemoBanner = () => (
  <Banner
    type="default"
    title="Local demo"
    description="Start the backend first: npm run dev in stripe-app-nextjs-backend (localhost:3006). Test mode is never paywalled; set PAYWALL_ENFORCE_IN_TEST_MODE=true in the backend's .env.local to walk through the trial here."
  />
);

const REASON_LABELS: Record<AccessReason, string> = {
  test_mode: "Test mode is free",
  subscribed: "Active subscription",
  trialing: "Free trial running",
  trial_not_started: "Free trial not started",
  trial_expired: "Free trial ended (time)",
  trial_limit_reached: "Free trial ended (allowance used)",
  payment_past_due: "Subscription past due",
};

/**
 * Whether the backend counted a use, in words. Only a running trial has an
 * allowance to count against: test mode and subscribers pass through the
 * gate uncounted, so "Used so far" stays where it was.
 */
export function usageCountedText(status: PaywallStatus, unit: string): string {
  if (status.reason === "trialing") {
    const { usageCount } = status.trial;
    const limit = status.limits.trialCountLimit;
    return limit === null
      ? `Counted: ${usageCount} ${unit}s used in the trial so far.`
      : `Counted: ${usageCount} of ${limit} ${unit}s used in the trial.`;
  }
  if (status.reason === "test_mode") {
    return "Not counted: test mode is free, so nothing is taken from the trial allowance.";
  }
  if (status.reason === "subscribed") {
    return "Not counted: a subscription has no trial allowance to use up.";
  }
  return "Not counted: the backend refused this use.";
}

const limitText = (limit: number | null, noun: string) =>
  limit === null ? "no limit" : `${limit} ${noun}${limit === 1 ? "" : "s"}`;

/** Spinner while loading, the error if loading failed, otherwise the children. */
const WhenLoaded = ({
  children,
}: {
  children: (status: PaywallStatus) => ReactNode;
}) => {
  const { state, error, status } = usePaywall();
  if (state === "loading") return <Spinner size="small" />;
  if (state === "error" || !status) {
    return (
      <Box css={{ stack: "y", gap: "xsmall" }}>
        <Banner
          type="critical"
          title="Couldn't load the paywall status"
          description={error?.message ?? "Unknown error"}
        />
        {error?.hint && (
          <Box css={{ font: "caption", color: "secondary" }}>💡 {error.hint}</Box>
        )}
      </Box>
    );
  }
  return <>{children(status)}</>;
};

// ---------------------------------------------------------------------------
//  1. Status
// ---------------------------------------------------------------------------

/** What the backend decided for this account, field by field. */
export function PaywallStatusDemo() {
  const { refresh, pending, actionError, lastRecheck } = usePaywall();

  return (
    <WhenLoaded>
      {(status) => (
        <Box css={{ stack: "y", gap: "medium" }}>
          <Box css={{ stack: "x", gap: "small", alignY: "center", wrap: "wrap" }}>
            <Badge type={status.access === "granted" ? "positive" : "negative"}>
              access {status.access}
            </Badge>
            <Badge type={status.mode === "live" ? "warning" : "info"}>
              {status.mode} mode
            </Badge>
            <Inline css={{ font: "caption", color: "secondary" }}>
              {REASON_LABELS[status.reason]}
            </Inline>
          </Box>

          <PropertyList>
            <PropertyListItem
              label="Trial length"
              value={limitText(status.limits.trialDaysLimit, "day")}
            />
            <PropertyListItem
              label="Trial allowance"
              value={limitText(status.limits.trialCountLimit, UNIT)}
            />
            <PropertyListItem
              label="Trial started"
              value={status.trial.startedAt ? formatDate(status.trial.startedAt) : "not yet"}
            />
            <PropertyListItem
              label="Trial ends"
              value={status.trial.expiresAt ? formatDate(status.trial.expiresAt) : "—"}
            />
            <PropertyListItem
              label="Used so far"
              value={
                status.reason === "test_mode"
                  ? `${status.trial.usageCount} ${UNIT}s (not counted in test mode)`
                  : `${status.trial.usageCount} ${UNIT}s`
              }
            />
            <PropertyListItem
              label="Plan"
              value={
                status.subscription
                  ? `${status.subscription.planName ?? "Custom plan"} (${status.subscription.status.replace("_", " ")})`
                  : "none"
              }
            />
          </PropertyList>

          <Box>
            <Button onPress={refresh} disabled={pending !== null}>
              Recheck my plan
              {pending === "refresh" && <Spinner size="small" />}
            </Button>
          </Box>
          <RecheckResult recheck={lastRecheck} />
          {pending === null && actionError && (
            <Banner
              type="critical"
              title="Request failed"
              description={actionError.message}
            />
          )}
          <Box>
            <PlansLink>See plans and pricing (public page, no login)</PlansLink>
          </Box>
          <Box css={{ font: "caption", color: "secondary" }}>
            The limits come from TRIAL_DAYS_LIMIT and TRIAL_COUNT_LIMIT on the
            backend. Recheck asks the backend to re-read this account&apos;s
            subscriptions from Stripe.
          </Box>
        </Box>
      )}
    </WhenLoaded>
  );
}

// ---------------------------------------------------------------------------
//  2. The gated feature
// ---------------------------------------------------------------------------

/** The paid feature itself: what <Paywall> shows when access is granted. */
function CreateWidget() {
  const { recordUse, pending, actionError } = usePaywall();
  const [widgets, setWidgets] = useState<string[]>([]);
  // The status the backend sent with the most recent widget.
  const [lastUse, setLastUse] = useState<PaywallStatus | null>(null);

  const create = useCallback(async () => {
    // The backend checks access, counts the use, and only then does the
    // work. If it answers "denied" the provider's status changes and
    // <Paywall> swaps this component for the upgrade steps by itself.
    const use = await recordUse();
    if (use?.allowed) {
      setWidgets((previous) => [use.result.widgetId, ...previous]);
      setLastUse(use.status);
    }
  }, [recordUse]);

  return (
    <Box css={{ stack: "y", gap: "small" }}>
      <Box>
        <Button type="primary" onPress={create} disabled={pending !== null}>
          Create a widget
          {pending === "use-feature" && <Spinner size="small" />}
        </Button>
      </Box>

      {lastUse && (
        <Box css={{ stack: "y", gap: "xsmall" }}>
          <Box css={{ stack: "x", gap: "small", alignY: "center", wrap: "wrap" }}>
            <Inline css={{ fontWeight: "semibold" }}>Server response</Inline>
            <Badge type="positive">200 allowed</Badge>
            <Inline css={{ font: "caption", color: "secondary" }}>
              reason: {lastUse.reason}
            </Inline>
          </Box>
          <Box css={{ font: "caption" }}>{usageCountedText(lastUse, UNIT)}</Box>
        </Box>
      )}

      {widgets.length > 0 && (
        <Box css={{ stack: "y", gap: "xsmall" }}>
          {widgets.map((widgetId) => (
            <Box key={widgetId} css={{ font: "caption" }}>
              Created {widgetId}
            </Box>
          ))}
        </Box>
      )}

      {actionError && (
        <Banner
          type="critical"
          title="Request failed"
          description={actionError.message}
        />
      )}
    </Box>
  );
}

export type PaywallDemoProps = {
  context: ExtensionContextValue;
};

/** A paid feature behind the paywall. */
export function GatedFeatureDemo({ context }: PaywallDemoProps) {
  return (
    <Box css={{ stack: "y", gap: "small" }}>
      <Box css={{ color: "secondary", font: "caption" }}>
        Everything below is wrapped in &lt;Paywall&gt;. Creating a widget calls
        a backend route that checks access first and answers 402 Payment
        Required when there is none.
      </Box>
      <Paywall context={context} unit={UNIT}>
        <CreateWidget />
      </Paywall>
    </Box>
  );
}

// ---------------------------------------------------------------------------
//  3. Preview
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

type Scenario = {
  id: string;
  label: string;
  /** The made-up facts; the limits are filled in from the backend's. */
  input: (limits: PaywallLimits) => Omit<PaywallInput, "limits">;
};

const PRO_PLAN = {
  planName: "Pro",
  currentPeriodEnd: new Date(Date.now() + 20 * DAY_MS).toISOString(),
  cancelAtPeriodEnd: false,
};

/** One scenario per AccessReason, so every branch of the decision is visible. */
export const PREVIEW_SCENARIOS: Scenario[] = [
  {
    id: "test_mode",
    label: "Test mode (always free)",
    input: () => ({ mode: "test", trial: null, subscription: null }),
  },
  {
    id: "trial_not_started",
    label: "Live mode, trial not started",
    input: () => ({ mode: "live", trial: null, subscription: null }),
  },
  {
    id: "trialing",
    label: "Trial running",
    input: () => ({
      mode: "live",
      trial: { startedAt: daysAgo(3), usageCount: 4 },
      subscription: null,
    }),
  },
  {
    id: "trial_expired",
    label: "Trial ended: out of time",
    input: (limits) => ({
      mode: "live",
      trial: { startedAt: daysAgo((limits.trialDaysLimit ?? 30) + 1), usageCount: 4 },
      subscription: null,
    }),
  },
  {
    id: "trial_limit_reached",
    label: "Trial ended: allowance used",
    input: (limits) => ({
      mode: "live",
      trial: { startedAt: daysAgo(3), usageCount: limits.trialCountLimit ?? 25 },
      subscription: null,
    }),
  },
  {
    id: "subscribed",
    label: "Subscribed",
    input: () => ({
      mode: "live",
      trial: { startedAt: daysAgo(40), usageCount: 25 },
      subscription: { status: "active", ...PRO_PLAN },
    }),
  },
  {
    id: "payment_past_due",
    label: "Subscription past due",
    input: () => ({
      mode: "live",
      trial: { startedAt: daysAgo(40), usageCount: 25 },
      subscription: { status: "past_due", ...PRO_PLAN },
    }),
  },
];

// The preview needs limits even when a limit is switched off on the backend
// (otherwise "out of time" could never be shown).
const PREVIEW_FALLBACK_LIMITS = { trialDaysLimit: 30, trialCountLimit: 25 };

const noop = async () => undefined;

/** Every paywall state, rendered from made-up data with the real components. */
export function PaywallPreviewDemo({ context }: PaywallDemoProps) {
  const { status, refresh, pending, actionError, lastRecheck } = usePaywall();
  const [scenarioId, setScenarioId] = useState(PREVIEW_SCENARIOS[1].id);

  const preview = useMemo(() => {
    const limits: PaywallLimits = {
      trialDaysLimit:
        status?.limits.trialDaysLimit ?? PREVIEW_FALLBACK_LIMITS.trialDaysLimit,
      trialCountLimit:
        status?.limits.trialCountLimit ?? PREVIEW_FALLBACK_LIMITS.trialCountLimit,
    };
    const scenario =
      PREVIEW_SCENARIOS.find((candidate) => candidate.id === scenarioId) ??
      PREVIEW_SCENARIOS[0];
    // The same function the backend runs, fed made-up facts.
    return resolvePaywall({ ...scenario.input(limits), limits });
  }, [scenarioId, status]);

  return (
    <Box css={{ stack: "y", gap: "medium" }}>
      <Box css={{ color: "secondary", font: "caption" }}>
        Pick a situation to see what the user gets. Nothing here changes your
        trial: the trial button is disabled. The login and &quot;Recheck my
        plan&quot; in the upgrade steps are the real ones; the recheck shows
        what the backend answers for your own account.
      </Box>

      <Select
        name="paywall-scenario"
        label="Situation"
        value={scenarioId}
        onChange={(event) => setScenarioId(event.target.value)}
      >
        {PREVIEW_SCENARIOS.map((scenario) => (
          <option key={scenario.id} value={scenario.id}>
            {scenario.label}
          </option>
        ))}
      </Select>

      <Box css={{ stack: "x", gap: "small", alignY: "center", wrap: "wrap" }}>
        <Badge type={preview.access === "granted" ? "positive" : "negative"}>
          access {preview.access}
        </Badge>
        <Inline css={{ font: "caption", color: "secondary" }}>
          reason: {preview.reason} · view: {preview.view}
        </Inline>
      </Box>

      <Box
        css={{
          padding: "medium",
          borderRadius: "medium",
          keyline: "neutral",
        }}
      >
        <PaywallGate
          context={context}
          status={preview}
          // The trial button is disabled by `preview`; the recheck is the
          // real request, so its spinner, answer and error are real too.
          actions={{ startTrial: noop, refresh }}
          pending={pending === "refresh" ? pending : null}
          actionError={pending === null ? actionError : null}
          lastRecheck={lastRecheck}
          unit={UNIT}
          preview
        >
          <Box css={{ color: "secondary" }}>
            (Your paid feature renders here.)
          </Box>
        </PaywallGate>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
//  4. Reset (development only)
// ---------------------------------------------------------------------------

/** Forget the trial so the walkthrough can be repeated. */
export function ResetTrialDemo() {
  const { resetTrial, pending, actionError } = usePaywall();

  return (
    <Box css={{ stack: "y", gap: "small" }}>
      <Box css={{ color: "secondary", font: "caption" }}>
        Deletes this account&apos;s trial for the current mode. The backend
        only allows this under next dev; in production the route answers 404,
        because a trial must not be restartable.
      </Box>
      <Box>
        <Button type="destructive" onPress={resetTrial} disabled={pending !== null}>
          Reset the trial
          {pending === "reset" && <Spinner size="small" />}
        </Button>
      </Box>
      {pending === null && actionError && (
        <Box css={{ font: "caption", color: "secondary" }}>
          Last request failed: {actionError.message}
        </Box>
      )}
    </Box>
  );
}
