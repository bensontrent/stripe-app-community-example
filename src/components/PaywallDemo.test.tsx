import { getMockContextProps, render } from "@stripe/ui-extension-sdk/testing";
import {
  Badge,
  Banner,
  Button,
  Link,
  PageModule,
  PropertyListItem,
  Select,
} from "@stripe/ui-extension-sdk/ui";

import {
  getPaywallStatus,
  getUserInfo,
  plansPageUrl,
  refreshPaywallStatus,
  requestFeatureUse,
  startTrial,
} from "../api/backend";
import { PaywallExample } from "../pages/ExampleDetail/PaywallExample";
import { resolvePaywall, type PaywallInput, type PaywallStatus } from "../types/paywall";
import { trialEndedText, trialRemainingText, trialTermsText } from "./Paywall";
import { PREVIEW_SCENARIOS, usageCountedText } from "./PaywallDemo";

jest.mock("../api/backend", () => ({
  ...jest.requireActual("../api/backend"),
  getPaywallStatus: jest.fn(),
  startTrial: jest.fn(),
  requestFeatureUse: jest.fn(),
  refreshPaywallStatus: jest.fn(),
  // The upgrade steps render <Login>, which asks who is logged in.
  getUserInfo: jest.fn(),
}));

const mockGetStatus = getPaywallStatus as jest.MockedFunction<typeof getPaywallStatus>;
const mockStartTrial = startTrial as jest.MockedFunction<typeof startTrial>;
const mockUseFeature = requestFeatureUse as jest.MockedFunction<typeof requestFeatureUse>;
const mockRefresh = refreshPaywallStatus as jest.MockedFunction<typeof refreshPaywallStatus>;
const mockGetUserInfo = getUserInfo as jest.MockedFunction<typeof getUserInfo>;

const LIMITS = { trialDaysLimit: 30, trialCountLimit: 25 };
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

/** A status the way the backend would compute it. */
const statusFor = (overrides: Partial<PaywallInput> = {}): PaywallStatus =>
  resolvePaywall({
    mode: "live",
    limits: LIMITS,
    trial: null,
    subscription: null,
    ...overrides,
  });

const NOT_STARTED = statusFor();
const TRIALING = statusFor({ trial: { startedAt: daysAgo(2), usageCount: 24 } });
const LIMIT_REACHED = statusFor({ trial: { startedAt: daysAgo(2), usageCount: 25 } });

// The provider fetches in an effect; flush the microtask queue so the
// mocked promise resolves before assertions.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const renderExample = async () => {
  const rendered = render(<PaywallExample context={getMockContextProps()} />);
  await flush();
  await rendered.update();
  return rendered;
};

type Wrapper = ReturnType<typeof render>["wrapper"];

const findButton = (wrapper: Wrapper, label: string) =>
  wrapper.findAll(Button).find((button) => button.text.includes(label));

const badgeTexts = (wrapper: Wrapper) => wrapper.findAll(Badge).map((badge) => badge.text);

describe("PaywallExample", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserInfo.mockResolvedValue(null);
  });

  it("renders the four modules from one status fetch", async () => {
    mockGetStatus.mockResolvedValue(statusFor({ mode: "test" }));

    const { wrapper } = await renderExample();

    expect(mockGetStatus).toHaveBeenCalledTimes(1);
    expect(wrapper.findAll(PageModule).map((module) => module.props.title)).toEqual([
      "1. Paywall status",
      "2. A paid feature",
      "3. Preview every state",
      "4. Start over",
    ]);
  });

  it("shows the feature straight away in test mode", async () => {
    mockGetStatus.mockResolvedValue(statusFor({ mode: "test" }));

    const { wrapper } = await renderExample();

    expect(badgeTexts(wrapper)).toContain("access granted");
    expect(findButton(wrapper, "Create a widget")).toBeDefined();
    // Only the preview (disabled) offers a trial; the real gate doesn't.
    expect(
      wrapper
        .findAll(Button)
        .filter((button) => button.text.includes("Start free trial"))
        .every((button) => button.props.disabled),
    ).toBe(true);
  });

  it("offers the trial first, then shows the feature once it is started", async () => {
    mockGetStatus.mockResolvedValue(NOT_STARTED);
    mockStartTrial.mockResolvedValue(
      statusFor({ trial: { startedAt: new Date().toISOString(), usageCount: 0 } }),
    );

    const { wrapper, update } = await renderExample();
    expect(findButton(wrapper, "Create a widget")).toBeUndefined();

    const start = wrapper
      .findAll(Button)
      .find((button) => button.text.includes("Start free trial") && !button.props.disabled);
    start!.trigger("onPress");
    await flush();
    await update();

    expect(mockStartTrial).toHaveBeenCalledTimes(1);
    expect(findButton(wrapper, "Create a widget")).toBeDefined();
    expect(badgeTexts(wrapper)).toContain("Free trial");
  });

  it("swaps the feature for the upgrade steps when the backend answers 402", async () => {
    mockGetStatus.mockResolvedValue(TRIALING);
    mockUseFeature.mockResolvedValue({ allowed: false, status: LIMIT_REACHED });

    const { wrapper, update } = await renderExample();

    findButton(wrapper, "Create a widget")!.trigger("onPress");
    await flush();
    await update();
    await flush();
    await update();

    expect(findButton(wrapper, "Create a widget")).toBeUndefined();
    expect(badgeTexts(wrapper)).toContain("access denied");
    const banner = wrapper
      .findAll(Banner)
      .find((candidate) => String(candidate.props.title).includes("free trial"));
    expect(banner!.props.title).toBe("You have used all 25 widgets of your free trial");
  });

  it("lifts the paywall when a recheck finds a subscription", async () => {
    mockGetStatus.mockResolvedValue(LIMIT_REACHED);
    mockRefresh.mockResolvedValue(
      statusFor({
        trial: { startedAt: daysAgo(2), usageCount: 25 },
        subscription: {
          status: "active",
          planName: "Pro",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
      }),
    );

    const { wrapper, update } = await renderExample();
    await flush();
    await update();
    expect(findButton(wrapper, "Create a widget")).toBeUndefined();

    wrapper
      .findAll(Button)
      .find((button) => button.text.includes("Recheck my plan") && !button.props.disabled)!
      .trigger("onPress");
    await flush();
    await update();

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(findButton(wrapper, "Create a widget")).toBeDefined();
  });

  it("fails closed when the status can't be loaded", async () => {
    mockGetStatus.mockRejectedValue(new Error("Failed to fetch"));

    const { wrapper } = await renderExample();

    expect(findButton(wrapper, "Create a widget")).toBeUndefined();
    const titles = wrapper.findAll(Banner).map((banner) => String(banner.props.title));
    expect(titles).toContain("Couldn't check your plan");
  });

  it("shows the server's answer when a recheck changes nothing", async () => {
    mockGetStatus.mockResolvedValue(LIMIT_REACHED);
    mockRefresh.mockResolvedValue(LIMIT_REACHED);

    const { wrapper, update } = await renderExample();
    await flush();
    await update();
    expect(wrapper.text).not.toContain("Server response");

    findButton(wrapper, "Recheck my plan")!.trigger("onPress");
    await flush();
    await update();

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(wrapper.text).toContain("Server response");
    expect(wrapper.text).toContain("No plan found for this Stripe account.");
  });

  it("says that test mode uses are not counted", async () => {
    const testMode = statusFor({ mode: "test" });
    mockGetStatus.mockResolvedValue(testMode);
    mockUseFeature.mockResolvedValue({
      allowed: true,
      status: testMode,
      result: { widgetId: "widget_12345678" },
    });

    const { wrapper, update } = await renderExample();
    // PropertyListItem takes its value as a prop, not as a child.
    const used = wrapper
      .findAll(PropertyListItem)
      .find((item) => item.props.label === "Used so far");
    expect(used!.props.value).toBe("0 widgets (not counted in test mode)");

    findButton(wrapper, "Create a widget")!.trigger("onPress");
    await flush();
    await update();

    expect(wrapper.text).toContain("Created widget_12345678");
    expect(wrapper.text).toContain("Not counted: test mode is free");
  });

  it("previews a chosen situation without touching the trial", async () => {
    mockGetStatus.mockResolvedValue(statusFor({ mode: "test" }));

    const { wrapper, update } = await renderExample();
    wrapper.find(Select)!.trigger("onChange", { target: { value: "payment_past_due" } });
    await flush();
    await update();

    const titles = wrapper.findAll(Banner).map((banner) => String(banner.props.title));
    expect(titles).toContain("Your plan is past due");
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockStartTrial).not.toHaveBeenCalled();

    // The upgrade steps show the real Login component, not a placeholder:
    // it asked the backend who is logged in and offers the login button.
    expect(mockGetUserInfo).toHaveBeenCalledTimes(1);
    const login = findButton(wrapper, "Log in or create an account");
    expect(login).toBeDefined();
    expect(login!.props.disabled).toBeFalsy();
    // Both "Recheck my plan" buttons on the page are live: the status
    // panel's and the preview's. Pressing the preview's asks the real
    // backend and shows its answer without changing the previewed situation.
    const recheck = wrapper
      .findAll(Button)
      .filter((button) => button.text.includes("Recheck my plan"));
    expect(recheck.map((button) => Boolean(button.props.disabled))).toEqual([false, false]);

    mockRefresh.mockResolvedValue(statusFor({ mode: "test" }));
    recheck[1].trigger("onPress");
    await flush();
    await update();

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(wrapper.text).toContain("This is the answer for your real Stripe account.");
    const after = wrapper.findAll(Banner).map((banner) => String(banner.props.title));
    expect(after).toContain("Your plan is past due");
  });

  it("keeps the trial button disabled in a preview", async () => {
    mockGetStatus.mockResolvedValue(statusFor({ mode: "test" }));

    const { wrapper, update } = await renderExample();
    wrapper.find(Select)!.trigger("onChange", { target: { value: "trial_not_started" } });
    await flush();
    await update();

    expect(findButton(wrapper, "Start free trial")!.props.disabled).toBe(true);
  });
});

describe("preview scenarios", () => {
  it("cover every reason the paywall can give, each under its own id", () => {
    const reasons = PREVIEW_SCENARIOS.map(
      (scenario) => resolvePaywall({ ...scenario.input(LIMITS), limits: LIMITS }).reason,
    );
    expect(reasons).toEqual(PREVIEW_SCENARIOS.map((scenario) => scenario.id));
    expect(new Set(reasons).size).toBe(7);
  });
});

describe("usage wording", () => {
  it("says whether a use was counted", () => {
    expect(usageCountedText(TRIALING, "widget")).toBe(
      "Counted: 24 of 25 widgets used in the trial.",
    );
    expect(usageCountedText(statusFor({ mode: "test" }), "widget")).toContain(
      "Not counted: test mode is free",
    );
  });
});

describe("paywall wording", () => {
  it("states the terms for whichever limits are on", () => {
    expect(trialTermsText(LIMITS, "widget")).toBe(
      "Your free trial lasts 30 days and includes 25 widgets, whichever runs out first.",
    );
    expect(trialTermsText({ trialDaysLimit: 1, trialCountLimit: null }, "widget")).toBe(
      "Your free trial lasts 1 day.",
    );
    expect(trialTermsText({ trialDaysLimit: null, trialCountLimit: 1 }, "widget")).toBe(
      "Your free trial includes 1 widget.",
    );
  });

  it("says how much of the trial is left", () => {
    expect(trialRemainingText(TRIALING, "widget")).toBe(
      "28 days and 1 widget left in your free trial",
    );
  });

  it("explains which limit ended the trial", () => {
    expect(trialEndedText(LIMIT_REACHED, "widget").title).toBe(
      "You have used all 25 widgets of your free trial",
    );
    const expired = statusFor({ trial: { startedAt: daysAgo(31), usageCount: 0 } });
    expect(trialEndedText(expired, "widget").title).toMatch(/^Your free trial ended on /);
  });
});

describe("public price list", () => {
  it("is linked from the app without going through the billing login", async () => {
    mockGetStatus.mockResolvedValue(NOT_STARTED);

    const { wrapper } = await renderExample();

    const hrefs = wrapper.findAll(Link).map((link) => String(link.props.href));
    expect(hrefs).toContain(plansPageUrl());
    expect(plansPageUrl()).toMatch(/\/plans$/);
  });
});
