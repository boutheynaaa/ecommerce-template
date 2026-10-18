
import { prisma } from "../lib/prisma.js";

try {
  await prisma.$connect();
  const result = await prisma.storeSettings.count();
  console.log("Database connection successful.");
  console.log("Store settings records:", result);
} catch (error) {
  console.error("Database connection failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
