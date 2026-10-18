
import { describe, expect, it, vi } from "vitest";
import { storeConfigSchema } from "./store.config.js";
import { storeDefaults } from "../../config/store.defaults.js";
import { createStoreService } from "./store.service.js";

describe("storeConfigSchema", () => {
  it("accepts valid default settings", () => {
    expect(storeConfigSchema.safeParse(storeDefaults).success).toBe(true);
  });

  it("rejects invalid hex colors", () => {
    const invalid = {
      ...storeDefaults,
      theme: {
        ...storeDefaults.theme,
        primaryColor: "purple",
      },
    };

    expect(storeConfigSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects non-HTTPS logo URLs", () => {
    const invalid = {
      ...storeDefaults,
      logoUrl: "http://example.com/logo.png",
    };

    expect(storeConfigSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("store service", () => {
  it("returns defaults when no saved settings exist", async () => {
    const repository = {
      getConfig: vi.fn().mockResolvedValue(null),
      saveConfig: vi.fn(),
    };

    const service = createStoreService(repository);
    await expect(service.getConfig()).resolves.toEqual(storeDefaults);
  });

  it("returns defaults when loading settings fails", async () => {
    const repository = {
      getConfig: vi.fn().mockRejectedValue(new Error("Database unavailable")),
      saveConfig: vi.fn(),
    };

    const service = createStoreService(repository);
    await expect(service.getConfig()).resolves.toEqual(storeDefaults);
  });
});
