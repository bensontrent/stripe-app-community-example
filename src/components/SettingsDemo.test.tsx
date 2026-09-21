import { getMockContextProps, render } from "@stripe/ui-extension-sdk/testing";
import {
  Badge,
  Banner,
  PageModule,
  Switch,
  TextField,
  Tooltip,
} from "@stripe/ui-extension-sdk/ui";

import { getSettings, patchSettings } from "../api/backend";
import { SettingsExample } from "../pages/ExampleDetail/SettingsExample";
import { DEFAULT_SETTINGS, type SettingsResponse } from "../types/settings";

jest.mock("../api/backend", () => ({
  ...jest.requireActual("../api/backend"),
  getSettings: jest.fn(),
  patchSettings: jest.fn(),
}));

const mockGetSettings = getSettings as jest.MockedFunction<typeof getSettings>;
const mockPatchSettings = patchSettings as jest.MockedFunction<typeof patchSettings>;

const response = (overrides: Partial<SettingsResponse> = {}): SettingsResponse => ({
  settings: { ...DEFAULT_SETTINGS, companyName: "Acme" },
  account: { companyName: "Acme" },
  user: {},
  mode: "test",
  ...overrides,
});

// The provider fetches in an effect; flush the microtask queue so the
// mocked promise resolves before assertions.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const renderExample = async () => {
  const rendered = render(<SettingsExample context={getMockContextProps()} />);
  await flush();
  await rendered.update();
  return rendered;
};

const findPackingSlips = (wrapper: ReturnType<typeof render>["wrapper"]) =>
  wrapper
    .findAll(Switch)
    .find((s) => String(s.props.label).includes("packing slips"));

describe("SettingsExample", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the three modules with the merged settings", async () => {
    mockGetSettings.mockResolvedValue(response());

    const { wrapper } = await renderExample();

    expect(mockGetSettings).toHaveBeenCalledTimes(1);
    expect(wrapper.findAll(PageModule).map((m) => m.props.title)).toEqual([
      "Account settings",
      "Your settings",
      "What the app reads",
    ]);
    // Uncontrolled on purpose — see the comment in AccountSettingsDemo.
    expect(wrapper.find(TextField)!.props.defaultValue).toBe("Acme");
    // The mode badge, plus one scope tag (badge + tooltip) per section. (The
    // tag's badge and the per-value source badges sit inside `trigger` /
    // `value` props, which the testing renderer doesn't traverse — the
    // merge itself is covered by settings.test.ts.)
    expect(wrapper.findAll(Badge).map((badge) => badge.text)).toContain("test mode");
    expect(wrapper.findAll(Tooltip)).toHaveLength(2);
  });

  it("patches the user scope optimistically and keeps the server's answer", async () => {
    mockGetSettings.mockResolvedValue(response());
    mockPatchSettings.mockResolvedValue(
      response({
        settings: { ...DEFAULT_SETTINGS, companyName: "Acme", printPackingSlips: true },
        user: { printPackingSlips: true },
      }),
    );

    const { wrapper, update } = await renderExample();
    expect(findPackingSlips(wrapper)!.props.checked).toBe(false);

    findPackingSlips(wrapper)!.trigger("onChange", { target: { checked: true } });
    await update();

    expect(mockPatchSettings).toHaveBeenCalledWith(expect.anything(), {
      scope: "user",
      settings: { printPackingSlips: true },
    });
    await flush();
    await update();
    expect(findPackingSlips(wrapper)!.props.checked).toBe(true);
    expect(wrapper.findAll(Badge).map((b) => b.text)).toContain("Saved");
  });

  it("reloads from the backend when a save fails", async () => {
    mockGetSettings.mockResolvedValue(response());
    mockPatchSettings.mockRejectedValue(new Error("Failed to fetch"));

    const { wrapper, update } = await renderExample();

    findPackingSlips(wrapper)!.trigger("onChange", { target: { checked: true } });
    await flush();
    await update();
    await flush();
    await update();

    // One initial load + one reload after the failed save.
    expect(mockGetSettings).toHaveBeenCalledTimes(2);
    const error = wrapper
      .findAll(Banner)
      .find((banner) => banner.props.type === "critical");
    expect(error!.props.title).toContain("Couldn't save");
  });

  it("shows the load error and its setup hint", async () => {
    mockGetSettings.mockRejectedValue(new Error("Failed to fetch"));

    const { wrapper } = await renderExample();

    const error = wrapper
      .findAll(Banner)
      .find((banner) => banner.props.type === "critical");
    expect(error!.props.title).toContain("Couldn't load");
    expect(mockPatchSettings).not.toHaveBeenCalled();
  });
});
