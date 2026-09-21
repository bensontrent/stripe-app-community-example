import { homeRoute, isHomeTab } from "./tabs";

describe("homeRoute", () => {
  it("addresses the default tab as the bare home route", () => {
    expect(homeRoute("examples")).toEqual({ key: "home" });
  });

  it("puts other tabs in the tabId param", () => {
    expect(homeRoute("routing")).toEqual({
      key: "home",
      params: { tabId: "routing" },
    });
  });
});

describe("isHomeTab", () => {
  it("accepts known tabs and rejects anything else", () => {
    expect(isHomeTab("routing")).toBe(true);
    expect(isHomeTab("settings")).toBe(false);
  });
});
