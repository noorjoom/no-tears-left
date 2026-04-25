import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';
import type { Role } from './constants';

/**
 * Edge-safe Auth.js config for middleware. No DB adapter or Drizzle here —
 * Edge runtime can't run pg. The full config in lib/auth.ts handles the
 * signIn/jwt/session callbacks where DB access is needed (those run on Node).
 */
export const { auth: edgeAuth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as Role;
      return session;
    },
  },
});
