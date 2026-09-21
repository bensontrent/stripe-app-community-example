// src/views/App.tsx
//
// The `stripe.dashboard.drawer.default` view: the panel that opens from the
// Dashboard's app menu on any page. It is the app's front door — a list of
// the examples, each of which lives at its own URL in the full-page app
// (/examples/<slug>, see src/routes.tsx and src/examples/catalog.ts).
//
// The drawer has no routes of its own, but it shares the full-page app's
// NavigationProvider (see providers/withNavigation), so `useNavigation()` can
// build links straight into full-page routes:
//
//   - Button href={createAppRoute(...)}   declarative, renders a real link
//   - List onAction → navigateToAppRoute  imperative, from an event handler
//
// It also reads `environment.objectContext`: opened on a customer page, it
// deep-links to that customer inside the app.

import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import { useNavigation } from "@stripe/ui-extension-sdk/navigation";
import {
  Box,
  Button,
  ContextView,
  Divider,
  Inline,
  List,
  ListItem,
} from "@stripe/ui-extension-sdk/ui";
import { EXAMPLES } from "../examples/catalog";
import { withNavigation } from "../providers/withNavigation";
import BrandIcon from "./brand_icon.svg";

const REPO_URL = "https://github.com/bensontrent/stripe-apps-community-examples";

function App(context: ExtensionContextValue) {
  const { createAppRoute, navigateToAppRoute } = useNavigation();
  const objectContext = context.environment.objectContext;

  return (
    <ContextView
      title="Community Example"
      brandColor="#334"
      brandIcon={BrandIcon}
      externalLink={{ label: "Source on GitHub", href: REPO_URL }}
    >
      <Box css={{ stack: "y", gap: "medium" }}>
        <Box css={{ color: "secondary", font: "caption" }}>
          Examples for Stripe App developers. Pick one to open it in the
          full-page app — every example has its own URL you can bookmark or
          share.
        </Box>

        {/* Declarative: the route descriptor becomes a real anchor. */}
        <Button type="primary" href={createAppRoute({ key: "home" })}>
          Open the full-page app
        </Button>

        {/* Context-aware deep link: only offered on a customer page. */}
        {objectContext?.object === "customer" && (
          <Button
            href={createAppRoute({
              key: "customer",
              params: { customerId: objectContext.id },
            })}
          >
            Open this customer in the app
          </Button>
        )}

        <Divider />

        <Inline css={{ font: "heading" }}>Examples</Inline>

        {/* Imperative: List reports the pressed id (the slug); we navigate
            by route name, so the URL pattern lives in routes.tsx only. */}
        <List
          onAction={(slug) =>
            navigateToAppRoute({ key: "example", params: { slug: String(slug) } })
          }
        >
          {EXAMPLES.map((example) => (
            <ListItem
              key={example.slug}
              id={example.slug}
              title={example.title}
              secondaryTitle={example.summary}
            />
          ))}
        </List>
      </Box>
    </ContextView>
  );
}

export default withNavigation(App);
