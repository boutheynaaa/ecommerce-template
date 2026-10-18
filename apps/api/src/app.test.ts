
import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { storeDefaults } from "./config/store.defaults.js";

describe("app", () => {
  const app = createApp();

  it("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /api/store/config returns injected store settings", async () => {
    const customConfig = {
      ...storeDefaults,
      name: "Test Store",
    };

    const storeSettings = {
      getConfig: vi.fn().mockResolvedValue(customConfig),
    };

    const testApp = createApp({ storeSettings });
    const res = await request(testApp).get("/api/store/config");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: customConfig });
    expect(storeSettings.getConfig).toHaveBeenCalledOnce();
  });

  it("unknown route returns 404 JSON", async () => {
    const res = await request(app).get("/api/nope");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("sets security headers and hides x-powered-by", async () => {
    const res = await request(app).get("/api/health");

    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});
