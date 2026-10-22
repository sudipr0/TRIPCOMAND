import { Lucia, TimeSpan } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { rawPrisma } from "./prisma.js";
import { env } from "../config/env.js";
import type { User } from "@prisma/client";

const adapter = new PrismaAdapter(rawPrisma.session, rawPrisma.user);

export const lucia = new Lucia(adapter, {
  sessionExpiresIn: new TimeSpan(30, "d"),
  sessionCookie: {
    name: "tc_session",
    expires: false,
    attributes: {
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      firstName: attributes.firstName,
      lastName: attributes.lastName,
      status: attributes.status,
    };
  },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: Omit<
      User,
      "passwordHash" | "resetToken" | "resetTokenExp"
    >;
  }
}
