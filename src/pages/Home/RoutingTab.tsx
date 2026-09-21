// src/pages/Home/RoutingTab.tsx
//
// A playground for every navigation API in @stripe/ui-extension-sdk/navigation:
//
//   useAppRoute()            read the matched route and its params
//   useAllSearchParams()     read/replace the whole search-param set
//   useSearchParam(name)     read/write one param, keep the rest
//   useNavigation()          createAppRoute (links) + navigateToAppRoute (events)
//   navigateToDashboardRoute soft-navigate to a native Dashboard page
//
// Watch the address bar while you use it: every control changes the URL.

import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import {
  navigateToDashboardRoute,
  useAllSearchParams,
  useAppRoute,
  useNavigation,
  useSearchParam,
} from "@stripe/ui-extension-sdk/navigation";
import {
  Box,
  Button,
  Checkbox,
  Icon,
  Inline,
  Link,
  List,
  ListItem,
  OverviewPage,
  PageModule,
  PropertyList,
  PropertyListItem,
  Select,
} from "@stripe/ui-extension-sdk/ui";
import type { ReactNode } from "react";
import { CUSTOMERS } from "../../data/mock";
import { homeRoute } from "./tabs";

const ROUTE_GUIDE = [
  {
    pattern: "/:tabId?",
    note: "Optional parameter: the selected Home tab. \"/\" is the default tab.",
  },
  {
    pattern: "/examples/:slug",
    note: "Required parameter, looked up in the example catalogue.",
  },
  {
    pattern: "/customers/:customerId",
    note: "List → detail with breadcrumbs back to the list.",
  },
  {
    pattern: "/customers/:customerId/invoices/:invoiceId",
    note: "Two nested parameters; breadcrumbs walk back up the hierarchy.",
  },
  {
    pattern: "/demo/:slug",
    note: "A retired path kept alive with <Redirect> so old bookmarks work.",
  },
];

const TAGS = ["hooks", "links", "redirects"] as const;

const readString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const readStrings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

// One demo row: the control on the left, what it demonstrates on the right.
const NavRow = ({ children, note }: { children: ReactNode; note: string }) => (
  <Box css={{ stack: "x", gap: "medium", alignY: "center" }}>
    <Box css={{ width: "1/3" }}>{children}</Box>
    <Inline css={{ font: "caption", color: "secondary" }}>{note}</Inline>
  </Box>
);

type RoutingTabProps = {
  context: ExtensionContextValue;
};

export function RoutingTab({ context }: RoutingTabProps) {
  const route = useAppRoute();
  const { createAppRoute, navigateToAppRoute } = useNavigation();

  // Default behaviour: writes *replace* the current history entry.
  const [searchParams, setSearchParams] = useAllSearchParams();
  const [sortParam, setSort] = useSearchParam("sort");
  // Opt in to pushing a history entry per change instead.
  const [, pushSearchParams] = useAllSearchParams({ replace: false });

  const selectedTags = readStrings(searchParams.tags);
  const toggleTag = (tag: string, checked: boolean) =>
    // The updater form merges with the latest params, so the tag checkboxes
    // and the sort select never overwrite each other.
    pushSearchParams((previous) => {
      const current = readStrings(previous.tags);
      const next = checked
        ? [...current, tag]
        : current.filter((item) => item !== tag);
      // An empty array is dropped from the URL, same as `undefined`.
      return { ...previous, tags: next };
    });

  // Deep links (?app_foo=bar on the Dashboard URL) arrive on the context, not
  // through the router: https://docs.stripe.com/stripe-apps/deep-links
  const deepLinkParams = context.environment.queryParams;

  return (
    <OverviewPage
      primaryColumn={
        <>
          <PageModule
            title="Where am I?"
            subtitle="useAppRoute() and useAllSearchParams() read the current URL"
          >
            <PropertyList>
              <PropertyListItem label="Route key" value={route.key} />
              <PropertyListItem
                label="Route params"
                value={JSON.stringify(route.routeParams)}
              />
              <PropertyListItem
                label="Search params"
                value={JSON.stringify(searchParams)}
              />
              <PropertyListItem label="Viewport" value={context.environment.viewportID} />
              {deepLinkParams && Object.keys(deepLinkParams).length > 0 && (
                <PropertyListItem
                  label="Deep-link params"
                  value={JSON.stringify(deepLinkParams)}
                />
              )}
            </PropertyList>
          </PageModule>

          <PageModule
            title="Keep UI state in the URL"
            subtitle="Search params survive reloads, bookmarks and sharing"
          >
            <Box css={{ stack: "y", gap: "medium" }}>
              <Select
                label="Sort (useSearchParam, replaces the history entry)"
                value={readString(sortParam)}
                onChange={(event) => setSort(event.target.value || undefined)}
              >
                <option value="">Default</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </Select>

              <Box css={{ stack: "y", gap: "xsmall" }}>
                <Inline css={{ font: "caption", color: "secondary" }}>
                  Tags (useAllSearchParams with replace: false, one history
                  entry per change — try the back button)
                </Inline>
                <Box css={{ stack: "x", gap: "large" }}>
                  {TAGS.map((tag) => (
                    <Checkbox
                      key={tag}
                      label={tag}
                      checked={selectedTags.includes(tag)}
                      onChange={(event) => toggleTag(tag, event.target.checked)}
                    />
                  ))}
                </Box>
              </Box>

              <Box>
                <Link onPress={() => setSearchParams({})}>
                  Clear all search params
                </Link>
              </Box>
            </Box>
          </PageModule>

          <PageModule
            title="Ways to navigate"
            subtitle="Prefer links; use imperative navigation for events"
          >
            <Box css={{ stack: "y", gap: "medium" }}>
              <NavRow note="Link href={createAppRoute(...)}: a real anchor, so hover, right-click and keyboard navigation just work.">
                <Link
                  href={createAppRoute({
                    key: "example",
                    params: { slug: "authentication" },
                  })}
                >
                  Declarative link
                </Link>
              </NavRow>

              <NavRow note="navigateToAppRoute(...) from an onPress handler: for form submits, row clicks and other events.">
                <Button
                  onPress={() =>
                    navigateToAppRoute({
                      key: "example",
                      params: { slug: "app-settings" },
                    })
                  }
                >
                  Imperative navigation
                </Button>
              </NavRow>

              <NavRow note="createAppRoute accepts searchParams, so a link can open a view with its URL state preset.">
                <Link
                  href={createAppRoute({
                    ...homeRoute("routing"),
                    searchParams: { sort: "newest", tags: ["links"] },
                  })}
                >
                  This tab, sorted newest with a tag
                </Link>
              </NavRow>

              <NavRow note="/demo/authentication no longer exists; its route renders <Redirect> to the current URL.">
                <Link
                  href={createAppRoute({
                    key: "legacyDemo",
                    params: { slug: "authentication" },
                  })}
                >
                  Retired path
                </Link>
              </NavRow>

              <NavRow note="A Dashboard route descriptor as href: soft navigation that keeps test/live mode and session state.">
                <Button href={{ name: "customers" }}>Dashboard: Customers</Button>
              </NavRow>

              <NavRow note="navigateToDashboardRoute(...) is the imperative form of the same thing.">
                <Button
                  onPress={() => navigateToDashboardRoute({ name: "payments" })}
                >
                  Dashboard: Payments
                </Button>
              </NavRow>
            </Box>
          </PageModule>
        </>
      }
      secondaryColumn={
        <>
          <PageModule title="Route table" subtitle="See src/routes.tsx">
            <PropertyList>
              {ROUTE_GUIDE.map((entry) => (
                <PropertyListItem
                  key={entry.pattern}
                  label={entry.pattern}
                  value={entry.note}
                />
              ))}
            </PropertyList>
          </PageModule>

          <PageModule
            title="Nested parameters"
            subtitle="Mock customers → invoices (list-to-detail)"
          >
            <List
              onAction={(id) =>
                navigateToAppRoute({
                  key: "customer",
                  params: { customerId: String(id) },
                })
              }
            >
              {CUSTOMERS.map((customer) => (
                <ListItem
                  key={customer.id}
                  id={customer.id}
                  title={customer.name}
                  secondaryTitle={customer.email}
                  value={<Icon name="chevronRight" size="xsmall" />}
                />
              ))}
            </List>
          </PageModule>
        </>
      }
    />
  );
}
