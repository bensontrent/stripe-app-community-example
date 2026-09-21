// src/pages/Home/ExamplesTab.tsx
//
// The default tab: one module per example in the catalogue, each linking to
// its detail route with `createAppRoute` (a real anchor, so hover,
// right-click and keyboard navigation work).

import { useNavigation } from "@stripe/ui-extension-sdk/navigation";
import {
  Box,
  Button,
  OverviewPage,
  PageModule,
  PropertyList,
  PropertyListItem,
} from "@stripe/ui-extension-sdk/ui";
import { EXAMPLES } from "../../examples/catalog";

export function ExamplesTab() {
  const { createAppRoute } = useNavigation();

  return (
    <OverviewPage
      primaryColumn={
        <>
          {EXAMPLES.map((example) => (
            <PageModule
              key={example.slug}
              title={example.title}
              subtitle={`/examples/${example.slug}`}
            >
              <Box css={{ stack: "y", gap: "medium" }}>
                <Box css={{ color: "secondary", font: "caption" }}>
                  {example.summary}
                </Box>
                <Box>
                  <Button
                    type="primary"
                    href={createAppRoute({
                      key: "example",
                      params: { slug: example.slug },
                    })}
                  >
                    Open {example.title.toLowerCase()}
                  </Button>
                </Box>
              </Box>
            </PageModule>
          ))}
        </>
      }
      secondaryColumn={
        <>
          <PageModule title="Before you start">
            <Box css={{ color: "secondary", font: "caption" }}>
              Both examples talk to the companion backend: run npm run dev in
              stripe-app-nextjs-backend (port 3006) first. Requests are signed
              with fetchStripeSignature(); point BACKEND_BASE in
              src/api/backend.ts at your deployment and list it in the
              manifest&apos;s connect-src before uploading.
            </Box>
          </PageModule>

          <PageModule title="How this app is put together">
            <PropertyList>
              <PropertyListItem label="Route config" value="src/routes.tsx" />
              <PropertyListItem
                label="Full-page view"
                value="src/views/FullPage.tsx"
              />
              <PropertyListItem label="Drawer view" value="src/views/App.tsx" />
              <PropertyListItem label="Examples" value="src/examples/catalog.ts" />
              <PropertyListItem
                label="Demo sections"
                value="src/components/BackendDemo.tsx, SettingsDemo.tsx"
              />
            </PropertyList>
          </PageModule>
        </>
      }
    />
  );
}
