import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import {
  validateCredentials,
  checkLoginAttempts,
  recordFailedAttempt,
  resetFailedAttempts,
} from '@/features/auth/services/auth.service';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const { email, password } = credentials;

        // Check if account is locked
        const lockStatus = await checkLoginAttempts(email);
        if (lockStatus.locked) {
          throw new Error(
            `Account is temporarily locked. Try again in ${lockStatus.remainingMinutes} minutes.`
          );
        }

        // Validate credentials
        const user = await validateCredentials(email, password);

        if (!user) {
          // Record failed attempt
          await recordFailedAttempt(email);
          // Generic error - don't reveal which field is wrong (Requirement 1.3)
          throw new Error('Invalid credentials');
        }

        // Reset failed attempts on successful login
        await resetFailedAttempts(email);

        return { id: user.id, email: user.email };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
