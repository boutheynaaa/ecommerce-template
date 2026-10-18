
import { prisma } from "../../lib/prisma.js";
import type {
  AuditLogInput,
  AuthRepository,
  Role,
  UserRecord,
} from "./auth.types.js";

function toUserRecord(user: {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
}): UserRecord {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
  };
}

export const authRepository: AuthRepository = {
  async findUserByEmail(email) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    return user ? toUserRecord(user) : null;
  },

  async findUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    return user ? toUserRecord(user) : null;
  },

  async createUser(input) {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        role: input.role ?? "CUSTOMER",
      },
    });

    return toUserRecord(user);
  },

  async createSession(input) {
    await prisma.session.create({
      data: input,
    });
  },

  async findSession(tokenHash) {
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) return null;

    return {
      user: toUserRecord(session.user),
      expiresAt: session.expiresAt,
    };
  },

  async deleteSession(tokenHash) {
    await prisma.session.deleteMany({
      where: { tokenHash },
    });
  },

  async createAuditLog(input: AuditLogInput) {
    await prisma.auditLog.create({
      data: {
        event: input.event,
        actorId: input.actorId ?? null,
        ip: input.ip ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  },

  async hasOwner() {
    const count = await prisma.user.count({
      where: { role: "OWNER" },
    });

    return count > 0;
  },
};
