
import promptPassword from "password-prompt";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../modules/auth/password.js";

const ownerInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.string().trim().min(2).max(100),
  password: z.string().min(10).max(128),
});

async function main() {
  const terminal = createInterface({ input, output });

  let email: string;
  let fullName: string;

  try {
    console.log("\n=== Create Store Owner ===\n");

    email = await terminal.question("Owner email: ");
    fullName = await terminal.question("Owner full name: ");
  } finally {
    terminal.close();
  }

  const password = await promptPassword(
    "Owner password (minimum 10 characters; hidden): ",
    { method: "hide" },
  );

  const validated = ownerInputSchema.safeParse({
    email,
    fullName,
    password,
  });

  if (!validated.success) {
    console.error("\nInvalid input:");

    for (const issue of validated.error.issues) {
      console.error(`- ${issue.path.join(".")}: ${issue.message}`);
    }

    process.exitCode = 1;
    return;
  }

  const {
    email: normalizedEmail,
    fullName: normalizedName,
    password: validatedPassword,
  } = validated.data;

  const existingOwner = await prisma.user.findFirst({
    where: { role: "OWNER" },
    select: { id: true },
  });

  if (existingOwner) {
    console.error(
      "\nAn OWNER account already exists. No account was created.",
    );
    process.exitCode = 1;
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingUser) {
    console.error(
      "\nThis email is already registered. No account was created.",
    );
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(validatedPassword);

  await prisma.$transaction(async (transaction) => {
    const owner = await transaction.user.create({
      data: {
        email: normalizedEmail,
        fullName: normalizedName,
        passwordHash,
        role: "OWNER",
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    await transaction.auditLog.create({
      data: {
        event: "auth.owner_created",
        actorId: owner.id,
        metadata: {
          source: "create-owner-script",
        },
      },
    });

    console.log("\nOwner account created successfully.");
    console.log("Email:", owner.email);
    console.log("Name:", owner.fullName);
    console.log("Role:", owner.role);
  });
}

main()
  .catch((error: unknown) => {
    console.error(
      "\nFailed to create owner account:",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
