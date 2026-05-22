import { PrismaClient } from "@prisma/client";

declare global {
  var __bobaPosPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__bobaPosPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__bobaPosPrisma__ = prisma;
}
