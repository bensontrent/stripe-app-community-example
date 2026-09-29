// hooks/usePaywall.tsx
//
// ============================================================================
//  usePaywall — the account's paywall status, for the whole view
// ============================================================================
//
// Wrap a view (or the part of it that is paid for) in <PaywallProvider> and
// call usePaywall() anywhere below it:
//
//   const { status, recordUse } = usePaywall();
//   if (status?.access === "granted") { … }
//
// Most screens don't call the hook directly — they wrap the paid feature in
// <Paywall> (src/components/Paywall.tsx), which reads the hook and renders
// either the feature or the right paywall view.
//
// What the hook holds is the backend's decision, never its own: `status` is
// the PaywallStatus the backend computed (src/types/paywall.ts), and every
// action — start the trial, use the feature, recheck the plan — answers with
// a fresh one that replaces it. The app cannot grant itself access by
// editing local state, because the backend route that does the paid work
// checks again (see /api/stripe-app/paywall/usage).
//
// Identity is the signed request (the Stripe account id), so the paywall
// works from the first request after installation, with no login. A login is
// only needed to pay — see the upgrade steps in src/components/Paywall.tsx.
//
// Like useSettings, this is a provider rather than a module-level cache: one
// fetch per view, shared by everything below it, gone when the view closes.

import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BackendConnectionError,
  getPaywallStatus,
  refreshPaywallStatus,
  requestFeatureUse,
  resetTrial as resetTrialRequest,
  startTrial as startTrialRequest,
  type FeatureUseResult,
} from "../api/backend";
import type { PaywallStatus } from "../types/paywall";

export type PaywallError = {
  message: string;
  hint?: string;
};

/** Which action is in flight, so each button can show its own spinner. */
export type PaywallAction = "start-trial" | "use-feature" | "refresh" | "reset";

export type PaywallActions = {
  /** Accept the trial terms: starts the account's free trial. */
  startTrial: () => Promise<void>;
  /**
   * Use the paid feature once. Resolves to the backend's answer, or null
   * when the request itself failed (the error is in `actionError`).
   */
  recordUse: () => Promise<FeatureUseResult | null>;
  /** "Recheck my plan": re-read subscriptions from Stripe. */
  refresh: () => Promise<void>;
  /** Development only: forget the trial. */
  resetTrial: () => Promise<void>;
};

export type PaywallContextValue = PaywallActions & {
  /** 'loading' until the first fetch answers; 'error' if it failed. */
  state: "loading" | "ready" | "error";
  /** Why the first fetch failed. */
  error: PaywallError | null;
  /** The backend's decision. Null until loaded. */
  status: PaywallStatus | null;
  /** The action in flight, if any. */
  pending: PaywallAction | null;
  /** Why the most recent action failed. Cleared when the next one starts. */
  actionError: PaywallError | null;
};

const PaywallContext = createContext<PaywallContextValue | null>(null);

const toPaywallError = (error: unknown): PaywallError => ({
  message: error instanceof Error ? error.message : String(error),
  hint: error instanceof BackendConnectionError ? error.hint : undefined,
});

type PaywallProviderProps = {
  context: ExtensionContextValue;
  children: ReactNode;
};

export function PaywallProvider({ context, children }: PaywallProviderProps) {
  const [state, setState] = useState<PaywallContextValue["state"]>("loading");
  const [error, setError] = useState<PaywallError | null>(null);
  const [status, setStatus] = useState<PaywallStatus | null>(null);
  const [pending, setPending] = useState<PaywallAction | null>(null);
  const [actionError, setActionError] = useState<PaywallError | null>(null);

  // Don't set state after the view has closed (a slow request may still
  // answer).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPaywallStatus(context)
      .then((loaded) => {
        if (cancelled) return;
        setStatus(loaded);
        setState("ready");
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(toPaywallError(caught));
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [context]);

  /**
   * Run one action: mark it pending, call the backend, keep the status it
   * answers with. Failures land in actionError instead of being thrown, so
   * event handlers can call the actions without a try/catch.
   */
  const run = useCallback(
    async function runAction<T>(
      action: PaywallAction,
      request: () => Promise<T>,
      statusOf: (response: T) => PaywallStatus,
    ): Promise<T | null> {
      setPending(action);
      setActionError(null);
      try {
        const response = await request();
        if (mounted.current) setStatus(statusOf(response));
        return response;
      } catch (caught) {
        if (mounted.current) setActionError(toPaywallError(caught));
        return null;
      } finally {
        if (mounted.current) setPending(null);
      }
    },
    [],
  );

  const actions = useMemo<PaywallActions>(
    () => ({
      startTrial: async () => {
        await run("start-trial", () => startTrialRequest(context), (s) => s);
      },
      recordUse: () =>
        run("use-feature", () => requestFeatureUse(context), (use) => use.status),
      refresh: async () => {
        await run("refresh", () => refreshPaywallStatus(context), (s) => s);
      },
      resetTrial: async () => {
        await run("reset", () => resetTrialRequest(context), (s) => s);
      },
    }),
    [context, run],
  );

  const value = useMemo<PaywallContextValue>(
    () => ({ state, error, status, pending, actionError, ...actions }),
    [state, error, status, pending, actionError, actions],
  );

  return <PaywallContext.Provider value={value}>{children}</PaywallContext.Provider>;
}

/** Read the paywall status and its actions. Must be rendered inside <PaywallProvider>. */
export function usePaywall(): PaywallContextValue {
  const value = useContext(PaywallContext);
  if (!value) {
    throw new Error("usePaywall() must be used inside <PaywallProvider>");
  }
  return value;
}
