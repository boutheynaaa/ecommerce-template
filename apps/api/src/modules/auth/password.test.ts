
import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  verifyDummyPassword,
} from "./password.js";

describe("password utilities", () => {
  it("hashes a password and verifies the correct password", async () => {
    const password = "a-long-test-password";
    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toBe(password);
    expect(passwordHash).toContain("$argon2id$");

    await expect(
      verifyPassword(passwordHash, password),
    ).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const passwordHash = await hashPassword("correct-password");

    await expect(
      verifyPassword(passwordHash, "wrong-password"),
    ).resolves.toBe(false);
  });

  it("does not throw when verifying a malformed hash", async () => {
    await expect(
      verifyPassword("not-a-valid-hash", "some-password"),
    ).resolves.toBe(false);
  });

  it("supports dummy password verification", async () => {
    await expect(
      verifyDummyPassword("some-password"),
    ).resolves.toBeUndefined();
  });
});
