// Routing tests: render the real FullPage view (NavigationProvider + AppRouter
// + routes) against the in-memory router from src/testing/mockRouter.ts and
// assert on what the URL becomes.

import { getMockContextProps, render } from "@stripe/ui-extension-sdk/testing";
import { DetailPage, OverviewPage } from "@stripe/ui-extension-sdk/ui";
import { Tabs } from "@stripe/ui-extension-sdk/ui/next";
import { installMockRouter } from "../testing/mockRouter";
import FullPage from "./FullPage";

// OverviewPage and DetailPage take their columns as props, not children.
// remote-ui renders such element props into a fragment (a tree of remote
// component nodes carrying the component *name*) that the wrapper's find()
// does not descend into, so walk the fragment by hand.
type RemoteNode = {
  type?: unknown;
  props?: Record<string, unknown>;
  children?: RemoteNode[];
};
function findAllInFragment(node: RemoteNode | undefined, type: string): RemoteNode[] {
  if (!node) return [];
  const own = node.type === type ? [node] : [];
  return own.concat(
    ...(node.children ?? []).map((child) => findAllInFragment(child, type)),
  );
}

const renderAt = (href: string, searchParams = {}) => {
  const router = installMockRouter(href, searchParams);
  const result = render(<FullPage {...getMockContextProps()} />);
  return { router, ...result };
};

describe("FullPage routing", () => {
  it("renders the default tab at / and switches tabs through the URL", async () => {
    const { router, wrapper, update } = renderAt("/");

    const tabs = wrapper.find(Tabs);
    expect(tabs).toBeTruthy();
    expect(tabs!.props.selectedKey).toBe("examples");

    tabs!.trigger("onSelectionChange", "routing");
    await update();

    expect(router.getHref()).toBe("/routing");
    expect(wrapper.find(Tabs)!.props.selectedKey).toBe("routing");
    // Tab changes are ordinary navigations: a new history entry each.
    expect(router.history).toEqual(["/", "/routing"]);
  });

  it("navigates back to the bare home URL for the default tab", async () => {
    const { router, wrapper, update } = renderAt("/routing");

    wrapper.find(Tabs)!.trigger("onSelectionChange", "examples");
    await update();

    expect(router.getHref()).toBe("/");
  });

  it("links to both examples from the Examples tab", () => {
    const { wrapper } = renderAt("/");

    const page = wrapper.find(OverviewPage)!;
    const buttons = findAllInFragment(
      page.props.primaryColumn as unknown as RemoteNode,
      "Button",
    );
    // createAppRoute() produces a fullPageGlob descriptor with the path segments.
    expect(buttons.map((button) => button.props?.href)).toEqual([
      expect.objectContaining({
        params: { glob: ["examples", "authentication"], searchParams: undefined },
      }),
      expect.objectContaining({
        params: { glob: ["examples", "app-settings"], searchParams: undefined },
      }),
    ]);
  });

  it("redirects unknown single-segment paths home (replace, not push)", async () => {
    const { router, update } = renderAt("/no-such-tab");
    await update();

    expect(router.getHref()).toBe("/");
    expect(router.history).toEqual(["/"]);
  });

  it("redirects unmatched deeper paths home via redirectOnNotFound", async () => {
    const { router, update } = renderAt("/a/b/c/d");
    await update();

    expect(router.getHref()).toBe("/");
    expect(router.history).toEqual(["/"]);
  });

  it("forwards the retired /demo/:slug path to /examples/:slug", async () => {
    const { router, wrapper, update } = renderAt("/demo/authentication");
    await update();

    expect(router.getHref()).toBe("/examples/authentication");
    expect(router.history).toEqual(["/examples/authentication"]);
    expect(wrapper.find(DetailPage)!.props.title).toBe("Backend authentication");
  });

  it("renders the settings example at its URL", async () => {
    const { wrapper, update } = renderAt("/examples/app-settings");
    await update();

    expect(wrapper.find(DetailPage)!.props.title).toBe("App settings");
  });

  it("renders a not-found page for an unknown example slug", async () => {
    const { wrapper, update } = renderAt("/examples/nope");
    await update();

    expect(wrapper.find(DetailPage)!.props.title).toBe("Example not found");
  });

  it("resolves nested params and links back up through breadcrumbs", async () => {
    const { wrapper, update } = renderAt(
      "/customers/cus_demo_acme/invoices/in_demo_acme_002",
    );
    await update();

    const page = wrapper.find(DetailPage)!;
    expect(page.props.title).toBe("Invoice ACME-0002");
    expect(page.props.breadcrumbs.map((crumb) => crumb.label)).toEqual([
      "Routing examples",
      "Acme Robotics",
    ]);
    expect(page.props.breadcrumbs[1].route.params?.glob).toEqual([
      "customers",
      "cus_demo_acme",
    ]);
  });

  it("hands unknown customers over to the Dashboard with a route descriptor", async () => {
    const { wrapper, update } = renderAt("/customers/cus_real_123");
    await update();

    const page = wrapper.find(DetailPage)!;
    expect(page.props.title).toBe("Customer not in the demo data");
    const [button] = findAllInFragment(
      page.props.primaryColumn as unknown as RemoteNode,
      "Button",
    );
    expect(button?.props?.href).toEqual({
      name: "customerDetails",
      params: { customerId: "cus_real_123" },
    });
  });
});
