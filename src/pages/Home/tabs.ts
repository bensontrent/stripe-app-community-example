// src/pages/Home/tabs.ts
//
// The Home route is `/:tabId?`, so the selected tab is part of the URL:
// "/" is the default tab and "/routing" the other. Keeping the list here
// (rather than in the Tabs markup) lets the route validate what it receives
// and lets other pages build links to a tab without knowing the pattern.

export const HOME_TABS = ["examples", "routing"] as const;

export type HomeTabId = (typeof HOME_TABS)[number];

export const DEFAULT_TAB: HomeTabId = "examples";

export const isHomeTab = (value: string): value is HomeTabId =>
  (HOME_TABS as readonly string[]).includes(value);

/**
 * Route descriptor for a Home tab, for `createAppRoute` / `navigateToAppRoute`.
 * The default tab is addressed as "/" (no parameter) so every view has exactly
 * one canonical URL: "/" and "/examples" would otherwise be the same page.
 */
export function homeRoute(tabId: HomeTabId) {
  return tabId === DEFAULT_TAB
    ? { key: "home" as const }
    : { key: "home" as const, params: { tabId } };
}
