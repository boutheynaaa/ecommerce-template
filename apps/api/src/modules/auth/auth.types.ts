
export const ROLES = [
  "OWNER",
  "ADMIN",
  "STAFF",
  "CUSTOMER",
] as const;

export type Role = (typeof ROLES)[number];

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
}

export interface UserRecord extends AuthUser {
  passwordHash: string;
  isActive: boolean;
}

export interface AuditLogInput {
  event: string;
  actorId?: string | null;
  ip?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;

  createUser(input: {
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string;
    role?: Role;
  }): Promise<UserRecord>;

  createSession(input: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<void>;

  findSession(tokenHash: string): Promise<{
    user: UserRecord;
    expiresAt: Date;
  } | null>;

  deleteSession(tokenHash: string): Promise<void>;

  createAuditLog(input: AuditLogInput): Promise<void>;

  hasOwner(): Promise<boolean>;
}
