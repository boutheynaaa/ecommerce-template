
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { createAuthService } from "./auth.service.js";
import { createFakeAuthRepository } from "../../test/fake-auth-repository.js";

function getSessionCookie(
  cookies: string | string[] | undefined,
): string {
  const cookieList = Array.isArray(cookies)
    ? cookies
    : cookies
      ? [cookies]
      : [];

  const sessionCookie = cookieList
    .map((cookie) => cookie.split(";")[0] ?? "")
    .find((cookie) => cookie.startsWith("session="));

  if (!sessionCookie) {
    throw new Error("Session cookie was not set");
  }

  return sessionCookie;
}

describe("auth routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    const repository = createFakeAuthRepository();
    const auth = createAuthService(repository);

    app = createApp({
      auth,
      loginRateLimit: (_req, _res, next) => next(),
      registerRateLimit: (_req, _res, next) => next(),
    });
  });

  it("registers a customer and sets an HTTP-only session cookie", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "customer@example.com",
        password: "a-long-test-password",
        fullName: "Test Customer",
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("customer@example.com");
    expect(res.body.user.role).toBe("CUSTOMER");
    expect(res.body.user.passwordHash).toBeUndefined();

    const cookie = res.headers["set-cookie"];
    expect(cookie).toBeDefined();

    const cookieText = Array.isArray(cookie)
      ? cookie.join(";")
      : (cookie ?? "");

    expect(cookieText).toContain("HttpOnly");
    expect(cookieText).toContain("session=");
  });

  it("rejects invalid registration data", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "not-an-email",
        password: "short",
        fullName: "A",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("logs in and allows the user to access /me", async () => {
    const credentials = {
      email: "customer@example.com",
      password: "a-long-test-password",
      fullName: "Test Customer",
    };

    await request(app)
      .post("/api/auth/register")
      .send(credentials);

    const login = await request(app)
      .post("/api/auth/login")
      .send({
        email: credentials.email,
        password: credentials.password,
      });

    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe(credentials.email);

    const cookieHeader = getSessionCookie(login.headers["set-cookie"]);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookieHeader);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(credentials.email);
  });

  it("rejects unauthenticated access to /me", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("logs out and invalidates the session", async () => {
    const registration = await request(app)
      .post("/api/auth/register")
      .send({
        email: "logout@example.com",
        password: "a-long-test-password",
        fullName: "Logout Customer",
      });

    expect(registration.status).toBe(201);

    const cookieHeader = getSessionCookie(
      registration.headers["set-cookie"],
    );

    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookieHeader);

    expect(logout.status).toBe(204);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookieHeader);

    expect(me.status).toBe(401);
  });
});
