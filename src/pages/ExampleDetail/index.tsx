// src/pages/ExampleDetail/index.tsx
//
// The `example` route (`/examples/:slug`). One route, many pages: the slug is
// looked up in the catalogue and its demo component comes from EXAMPLE_DEMOS.
// Unknown slugs render a "not found" page with a way back rather than a
// blank screen.
//
// Breadcrumbs take a route descriptor from `createAppRoute`, the same object
// a Link's href takes.

import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import { useNavigation } from "@stripe/ui-extension-sdk/navigation";
import {
  Box,
  DetailPage,
  Link,
  PageModule,
  PropertyList,
  PropertyListItem,
} from "@stripe/ui-extension-sdk/ui";
import type { ComponentType } from "react";
import { findExample, type ExampleSlug } from "../../examples/catalog";
import { homeRoute } from "../Home/tabs";
import { AuthenticationExample } from "./AuthenticationExample";
import { SettingsExample } from "./SettingsExample";

export type DemoProps = {
  context: ExtensionContextValue;
};

// Slug → the full-page layout of that demo. The type makes a catalogue entry
// without a demo (or a demo without an entry) a compile error.
const EXAMPLE_DEMOS: Record<ExampleSlug, ComponentType<DemoProps>> = {
  authentication: AuthenticationExample,
  "app-settings": SettingsExample,
};

type ExampleDetailProps = {
  slug: string;
  context: ExtensionContextValue;
};

export function ExampleDetail({ slug, context }: ExampleDetailProps) {
  const { createAppRoute } = useNavigation();
  const example = findExample(slug);

  const breadcrumbs = [
    {
      type: "link" as const,
      label: "Examples",
      route: createAppRoute(homeRoute("examples")),
    },
  ];

  if (!example) {
    return (
      <DetailPage
        title="Example not found"
        breadcrumbs={breadcrumbs}
        primaryColumn={
          <PageModule title="Unknown example">
            <Box css={{ stack: "y", gap: "small" }}>
              <Box>
                Nothing is registered under &ldquo;{slug}&rdquo;. If this
                link used to work, add a Redirect for it in src/routes.tsx.
              </Box>
              <Link href={createAppRoute(homeRoute("examples"))}>
                Browse all examples
              </Link>
            </Box>
          </PageModule>
        }
      />
    );
  }

  // findExample only returns catalogue entries, so the slug is a known key.
  const Demo = EXAMPLE_DEMOS[example.slug as ExampleSlug];

  return (
    <DetailPage
      title={example.title}
      description={example.summary}
      breadcrumbs={breadcrumbs}
      primaryColumn={<Demo context={context} />}
      secondaryColumn={
        <PageModule title="About this example">
          <PropertyList>
            <PropertyListItem label="URL" value={`/examples/${example.slug}`} />
            <PropertyListItem label="Source" value={example.source} />
          </PropertyList>
        </PageModule>
      }
    />
  );
}
