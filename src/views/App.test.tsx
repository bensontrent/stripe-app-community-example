import { getMockContextProps, render } from "@stripe/ui-extension-sdk/testing";
import { Button, List, ListItem } from "@stripe/ui-extension-sdk/ui";

import { EXAMPLES } from "../examples/catalog";
import { installMockRouter } from "../testing/mockRouter";
import App from "./App";

const findButton = (
  wrapper: ReturnType<typeof render>["wrapper"],
  label: string,
) => wrapper.findAll(Button).find((button) => button.text.includes(label));

describe("App (drawer)", () => {
  beforeEach(() => {
    // The drawer uses useNavigation(), which needs the Dashboard's router.
    installMockRouter("/");
  });

  it("links into the full-page app with a route descriptor", () => {
    const { wrapper } = render(<App {...getMockContextProps()} />);

    expect(findButton(wrapper, "Open the full-page app")!.props.href).toMatchObject({
      name: "fullPageGlob",
      params: { glob: [] },
    });
    expect(findButton(wrapper, "Open this customer")).toBeUndefined();
  });

  it("deep-links to the customer it was opened on", () => {
    const context = getMockContextProps({
      environment: {
        objectContext: { id: "cus_123", object: "customer" },
      },
    });
    const { wrapper } = render(<App {...context} />);

    expect(findButton(wrapper, "Open this customer")!.props.href).toMatchObject({
      name: "fullPageGlob",
      params: { glob: ["customers", "cus_123"] },
    });
  });

  it("lists every example from the catalogue, authentication included", () => {
    const { wrapper } = render(<App {...getMockContextProps()} />);

    const items = wrapper.findAll(ListItem);
    expect(items.map((item) => item.props.id)).toEqual(
      EXAMPLES.map((example) => example.slug),
    );
    expect(items.some((item) => item.props.id === "authentication")).toBe(true);
    expect(items.some((item) => item.props.id === "app-settings")).toBe(true);
  });

  it("navigates to an example's URL when its list item is pressed", async () => {
    const router = installMockRouter("/");
    const { wrapper, update } = render(<App {...getMockContextProps()} />);

    wrapper.find(List)!.trigger("onAction", "authentication");
    await update();

    expect(router.getHref()).toBe("/examples/authentication");
  });
});
