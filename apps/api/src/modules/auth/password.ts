
import {
  Algorithm,
  hash,
  verify,
} from "@node-rs/argon2";

const passwordOptions = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, passwordOptions);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHashPromise: Promise<string> | undefined;

export async function verifyDummyPassword(
  password: string,
): Promise<void> {
  dummyHashPromise ??= hashPassword(
    "dummy-password-used-only-for-timing-protection",
  );

  const dummyHash = await dummyHashPromise;
  await verifyPassword(dummyHash, password);
}
