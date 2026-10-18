
import { describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";

import { createAuthMiddleware } from "./auth.middleware.js";
import type { AuthService } from "./auth.service.js";
import type { AuthUser } from "./auth.types.js";

const customer: AuthUser = {
  id: "user-customer",
  email: "customer@example.com",
  fullName: "Test Customer",
  phone: null,
  role: "CUSTOMER",
};

function createTestApp(user?: AuthUser) {
  const auth = {
    authenticate: vi.fn().mockResolvedValue(user ?? null),
  } as unknown as AuthService;

  const middleware = createAuthMiddleware(auth);
  const app = express();

  app.use(cookieParser());

  // Test-only middleware: set a known user to test authorization behavior.
  app.use((req, _res, next) => {
    if (user) req.user = user;
    next();
  });

  app.get(
    "/protected",
    middleware.requireRole("OWNER", "ADMIN"),
    (_req, res) => {
      res.json({ allowed: true });
    },
  );

  return app;
}

describe("requireRole middleware", () => {
  it("returns 401 when no user is authenticated", async () => {
    const app = createTestApp();

    const res = await request(app).get("/protected");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 when the user has a disallowed role", async () => {
    const app = createTestApp(customer);

    const res = await request(app).get("/protected");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("allows a user with an authorized role", async () => {
    const owner: AuthUser = {
      ...customer,
      id: "user-owner",
      email: "owner@example.com",
      role: "OWNER",
    };

    const app = createTestApp(owner);

    const res = await request(app).get("/protected");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ allowed: true });
  });
});
