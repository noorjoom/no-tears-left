import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { isAdminDiscordId } from './role-guard';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'discord') return false;
      const discordId = account.providerAccountId;
      if (!discordId) return false;

      const username =
        (profile as { username?: string; global_name?: string } | null)?.username ??
        (profile as { global_name?: string } | null)?.global_name ??
        user.name ??
        'unknown';
      const avatar = user.image ?? null;

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.discordId, discordId))
        .limit(1);

      const shouldBeAdmin = isAdminDiscordId(discordId, process.env.ADMIN_DISCORD_IDS);

      if (existing.length === 0) {
        await db.insert(users).values({
          discordId,
          discordUsername: username,
          discordAvatar: avatar,
          role: shouldBeAdmin ? 'ADMIN' : 'MEMBER',
        });
      } else if (shouldBeAdmin && existing[0].role !== 'ADMIN') {
        await db
          .update(users)
          .set({ role: 'ADMIN' })
          .where(eq(users.discordId, discordId));
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === 'discord' && account.providerAccountId) {
        token.discordId = account.providerAccountId;
      }
      const discordId = typeof token.discordId === 'string' ? token.discordId : null;
      const hasId = typeof token.id === 'string';
      const hasRole = typeof token.role === 'string';
      if (discordId && (!hasId || !hasRole)) {
        const rows = await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(eq(users.discordId, discordId))
          .limit(1);
        if (rows[0]) {
          token.id = rows[0].id;
          token.role = rows[0].role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.id === 'string') session.user.id = token.id;
      if (typeof token.role === 'string') {
        session.user.role = token.role as 'MEMBER' | 'MOD' | 'ADMIN';
      }
      return session;
    },
  },
});
