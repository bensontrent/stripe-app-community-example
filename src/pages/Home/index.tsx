// src/pages/Home/index.tsx
//
// The `home` route (`/:tabId?`). The selected tab is read from the URL with
// `useAppRoute()` and written back with `navigateToAppRoute`, so tabs are
// bookmarkable and the browser's back/forward buttons move between them.

import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import {
  Redirect,
  useAppRoute,
  useNavigation,
} from "@stripe/ui-extension-sdk/navigation";
import { FullPageView } from "@stripe/ui-extension-sdk/ui";
import { Tab, Tabs } from "@stripe/ui-extension-sdk/ui/next";
import { ExamplesTab } from "./ExamplesTab";
import { RoutingTab } from "./RoutingTab";
import { DEFAULT_TAB, homeRoute, isHomeTab } from "./tabs";

type HomeProps = {
  context: ExtensionContextValue;
};

export function Home({ context }: HomeProps) {
  const route = useAppRoute();
  const { navigateToAppRoute } = useNavigation();

  // Checking `route.key` first narrows `routeParams` to this route's shape:
  // `{ tabId: string | undefined }`, straight from the "/:tabId?" pattern.
  const requestedTab = route.key === "home" ? route.routeParams.tabId : undefined;

  // "/:tabId?" matches *any* single segment, so "/whatever" lands here too.
  // Treat unknown values like an unmatched route: replace the URL with home.
  if (requestedTab !== undefined && !isHomeTab(requestedTab)) {
    return <Redirect route={{ key: "home" }} />;
  }

  const currentTab = requestedTab ?? DEFAULT_TAB;

  return (
    <FullPageView
      pageAction={{
        label: "Backend authentication demo",
        onPress: () =>
          navigateToAppRoute({
            key: "example",
            params: { slug: "authentication" },
          }),
      }}
    >
      <Tabs
        selectedKey={currentTab}
        onSelectionChange={(tabId) => {
          if (isHomeTab(tabId)) navigateToAppRoute(homeRoute(tabId));
        }}
      >
        <Tab id="examples" label="Examples">
          <ExamplesTab />
        </Tab>
        <Tab id="routing" label="Routing">
          <RoutingTab context={context} />
        </Tab>
      </Tabs>
    </FullPageView>
  );
}
