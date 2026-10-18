
import { beforeEach, describe, expect, it } from "vitest";
import { createAuthService } from "./auth.service.js";
import { createFakeAuthRepository } from "../../test/fake-auth-repository.js";

describe("auth service", () => {
  let repository: ReturnType<typeof createFakeAuthRepository>;
  let authService: ReturnType<typeof createAuthService>;

  beforeEach(() => {
    repository = createFakeAuthRepository();
    authService = createAuthService(repository);
  });

  it("registers a customer and creates a session", async () => {
    const result = await authService.register({
      email: "test@example.com",
      password: "a-long-test-password",
      fullName: "Test Customer",
    });

    expect(result.user.email).toBe("test@example.com");
    expect(result.user.role).toBe("CUSTOMER");
    expect(result.token).toBeTruthy();
    expect(result.user).not.toHaveProperty("passwordHash");

    await expect(
      authService.authenticate(result.token),
    ).resolves.toMatchObject({
      id: result.user.id,
      email: result.user.email,
    });
  });

  it("rejects duplicate email registration", async () => {
    const input = {
      email: "test@example.com",
      password: "a-long-test-password",
      fullName: "Test Customer",
    };

    await authService.register(input);

    await expect(authService.register(input)).rejects.toMatchObject({
      statusCode: 409,
      code: "EMAIL_TAKEN",
    });
  });

  it("rejects an incorrect password", async () => {
    await authService.register({
      email: "test@example.com",
      password: "a-long-test-password",
      fullName: "Test Customer",
    });

    await expect(
      authService.login({
        email: "test@example.com",
        password: "wrong-password",
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
    });
  });

  it("invalidates the session after logout", async () => {
    const result = await authService.register({
      email: "test@example.com",
      password: "a-long-test-password",
      fullName: "Test Customer",
    });

    await authService.logout(result.token);

    await expect(
      authService.authenticate(result.token),
    ).resolves.toBeNull();
  });

  it("rejects an expired session", async () => {
    const result = await authService.register({
      email: "test@example.com",
      password: "a-long-test-password",
      fullName: "Test Customer",
    });

    const expiredToken = "expired-test-token";
    const { hashSessionToken } = await import("./session-token.js");

    await repository.createSession({
      tokenHash: hashSessionToken(expiredToken),
      userId: result.user.id,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      authService.authenticate(expiredToken),
    ).resolves.toBeNull();
  });
});
