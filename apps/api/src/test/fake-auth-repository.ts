
import type {
  AuditLogInput,
  AuthRepository,
  Role,
  UserRecord,
} from "../modules/auth/auth.types.js";

interface StoredSession {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}

export function createFakeAuthRepository(): AuthRepository {
  const users: UserRecord[] = [];
  const sessions: StoredSession[] = [];
  const auditLogs: AuditLogInput[] = [];

  return {
    async findUserByEmail(email) {
      const user = users.find((item) => item.email === email);
      return user ? { ...user } : null;
    },

    async findUserById(id) {
      const user = users.find((item) => item.id === id);
      return user ? { ...user } : null;
    },

    async createUser(input) {
      const user: UserRecord = {
        id: crypto.randomUUID(),
        email: input.email,
        passwordHash: input.passwordHash,
        fullName: input.fullName,
        phone: input.phone ?? null,
        role: (input.role ?? "CUSTOMER") as Role,
        isActive: true,
      };

      users.push(user);
      return { ...user };
    },

    async createSession(input) {
      sessions.push({ ...input });
    },

    async findSession(tokenHash) {
      const session = sessions.find(
        (item) => item.tokenHash === tokenHash,
      );

      if (!session) return null;

      const user = users.find((item) => item.id === session.userId);

      if (!user) return null;

      return {
        user: { ...user },
        expiresAt: session.expiresAt,
      };
    },

    async deleteSession(tokenHash) {
      const index = sessions.findIndex(
        (item) => item.tokenHash === tokenHash,
      );

      if (index !== -1) sessions.splice(index, 1);
    },

    async createAuditLog(input) {
      auditLogs.push({ ...input });
    },

    async hasOwner() {
      return users.some((user) => user.role === "OWNER");
    },
  };
}
