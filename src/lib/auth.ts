import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "./prisma";

export type AppUserRole = "ADMIN" | "SALES";

export interface AppSession {
  user: {
    id: string;
    role: AppUserRole;
    name?: string | null;
    email?: string | null;
  };
}

declare module "next-auth" {
  interface User {
    id: string;
    role: AppUserRole;
    name?: string | null;
    email?: string | null;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppUserRole;
  }
}

export const authConfig = {
  providers: [
    Credentials({
      name: "Credenciais",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          return null;
        }

        // Buscar utilizador na base de dados
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
          },
        });

        if (!user) {
          return null;
        }

        // Validar password com bcrypt
        const passwordValid = await bcrypt.compare(password, user.passwordHash);

        if (!passwordValid) {
          return null;
        }

        // Retornar utilizador real da BD
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as AppUserRole,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: AppUserRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = (token.role as AppUserRole) ?? "SALES";
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthOptions;

