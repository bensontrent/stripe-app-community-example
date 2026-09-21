// Unit tests for the settings model: how a stored jsonb row becomes the flat
// Settings object, and what a patch may contain.

import {
  DEFAULT_SETTINGS,
  keysForScope,
  resetPatch,
  resolveScope,
  resolveSettings,
  validatePatch,
} from "./settings";

describe("resolveSettings", () => {
  it("falls back to defaults when nothing is stored", () => {
    expect(resolveSettings({}, {})).toEqual(DEFAULT_SETTINGS);
    expect(resolveSettings(null, undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it("reads each scope's own keys only", () => {
    // A user setting stored on the account row (or vice versa) is ignored.
    const settings = resolveSettings(
      { companyName: "Acme", labelSize: "8.5x11" },
      { printPackingSlips: true, companyName: "Not me" },
    );
    expect(settings).toEqual({
      ...DEFAULT_SETTINGS,
      companyName: "Acme",
      printPackingSlips: true,
    });
  });

  it("ignores stored values of the wrong type", () => {
    const settings = resolveSettings(
      { companyName: 42 },
      { labelSize: "A4", printPackingSlips: "yes" },
    );
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("resolveScope returns only what is stored, without defaults", () => {
    expect(resolveScope({ labelSize: "8.5x11" }, "user")).toEqual({
      labelSize: "8.5x11",
    });
    expect(resolveScope({}, "account")).toEqual({});
  });
});

describe("validatePatch", () => {
  it("accepts a well-formed patch as-is", () => {
    expect(validatePatch("account", { companyName: "Acme" })).toEqual({
      ok: true,
      stored: { companyName: "Acme" },
    });
    expect(
      validatePatch("user", { labelSize: "8.5x11", printPackingSlips: true }),
    ).toEqual({ ok: true, stored: { labelSize: "8.5x11", printPackingSlips: true } });
  });

  it("passes null through so the database can delete the key", () => {
    expect(validatePatch("user", { labelSize: null })).toEqual({
      ok: true,
      stored: { labelSize: null },
    });
  });

  it("rejects keys from the other scope", () => {
    const result = validatePatch("user", { companyName: "Acme" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/account setting/);
  });

  it("rejects unknown keys, including prototype names", () => {
    expect(validatePatch("user", { theme: "dark" }).ok).toBe(false);
    expect(validatePatch("user", { __proto__: { polluted: true } }).ok).toBe(false);
    expect(validatePatch("user", { constructor: "x" }).ok).toBe(false);
  });

  it("rejects wrong types, bad enum values and non-objects", () => {
    expect(validatePatch("user", { printPackingSlips: "yes" }).ok).toBe(false);
    expect(validatePatch("user", { labelSize: "A4" }).ok).toBe(false);
    expect(validatePatch("account", { companyName: "x".repeat(501) }).ok).toBe(false);
    expect(validatePatch("user", []).ok).toBe(false);
    expect(validatePatch("user", null).ok).toBe(false);
    expect(validatePatch("user", {}).ok).toBe(false);
  });
});

describe("resetPatch", () => {
  it("nulls every key of the scope", () => {
    expect(resetPatch("user")).toEqual({ labelSize: null, printPackingSlips: null });
    expect(Object.keys(resetPatch("account"))).toEqual(keysForScope("account"));
  });
});
