
import { AppError } from "../../lib/errors.js";
import type {
  AuthRepository,
  AuthUser,
  UserRecord,
} from "./auth.types.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";
import { hashPassword, verifyDummyPassword, verifyPassword } from "./password.js";
import { generateSessionToken, hashSessionToken } from "./session-token.js";

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
  };
}

export function createAuthService(repository: AuthRepository) {
  async function startSession(userId: string) {
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await repository.createSession({
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt,
    });

    return { token, expiresAt };
  }

  return {
    async register(input: RegisterInput, ip?: string) {
      const existingUser = await repository.findUserByEmail(input.email);

      if (existingUser) {
        throw new AppError(409, "EMAIL_TAKEN", "Email is already registered");
      }

      const user = await repository.createUser({
        email: input.email,
        passwordHash: await hashPassword(input.password),
        fullName: input.fullName,
        phone: input.phone,
        role: "CUSTOMER",
      });

      const session = await startSession(user.id);

      await repository.createAuditLog({
        event: "auth.register",
        actorId: user.id,
        ip,
      });

      return {
        user: toAuthUser(user),
        ...session,
      };
    },

    async login(input: LoginInput, ip?: string) {
      const user = await repository.findUserByEmail(input.email);

      if (!user) {
        await verifyDummyPassword(input.password);
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
      }

      const passwordIsValid = await verifyPassword(
        user.passwordHash,
        input.password,
      );

      if (!passwordIsValid || !user.isActive) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
      }

      const session = await startSession(user.id);

      await repository.createAuditLog({
        event: "auth.login",
        actorId: user.id,
        ip,
      });

      return {
        user: toAuthUser(user),
        ...session,
      };
    },

    async authenticate(token: string): Promise<AuthUser | null> {
      const tokenHash = hashSessionToken(token);
      const session = await repository.findSession(tokenHash);

      if (!session) return null;

      if (session.expiresAt.getTime() <= Date.now()) {
        await repository.deleteSession(tokenHash);
        return null;
      }

      if (!session.user.isActive) return null;

      return toAuthUser(session.user);
    },

    async logout(token: string | undefined, ip?: string) {
      if (!token) return;

      const tokenHash = hashSessionToken(token);
      const session = await repository.findSession(tokenHash);

      await repository.deleteSession(tokenHash);

      if (session) {
        await repository.createAuditLog({
          event: "auth.logout",
          actorId: session.user.id,
          ip,
        });
      }
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
