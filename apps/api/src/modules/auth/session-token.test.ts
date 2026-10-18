
import { describe, expect, it } from "vitest";
import {
  generateSessionToken,
  hashSessionToken,
} from "./session-token.js";

describe("session token utilities", () => {
  it("generates a secure-looking session token", () => {
    const token = generateSessionToken();

    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates different tokens", () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });

  it("hashes the same token consistently", () => {
    const token = generateSessionToken();

    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it("does not store the raw token as its hash", () => {
    const token = generateSessionToken();

    expect(hashSessionToken(token)).not.toBe(token);
  });
});
