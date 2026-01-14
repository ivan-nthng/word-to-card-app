import { getServerSession } from 'next-auth/next'
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { AUTH_ENABLED } from './config'

// Lazy initialization of authOptions to avoid env var validation during build
let authOptionsCache: NextAuthOptions | null = null

function getAuthOptions(): NextAuthOptions {
  if (!authOptionsCache) {
    authOptionsCache = {
      providers: [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID || '',
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
      ],
      callbacks: {
        async signIn({ user, account, profile }) {
          const allowedEmail = process.env.ALLOWED_EMAIL
          if (!allowedEmail) {
            return false
          }
          return user.email === allowedEmail
        },
      },
      pages: {
        signIn: '/',
      },
      secret: process.env.NEXTAUTH_SECRET,
    }
  }
  return authOptionsCache
}

// Export for NextAuth route handler
export const authOptions = getAuthOptions()

export async function getSession() {
  // When AUTH_ENABLED is false, return a mock session to bypass auth checks
  if (!AUTH_ENABLED) {
    return {
      user: {
        name: 'Test User',
        email: 'test@example.com',
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }
  return await getServerSession(getAuthOptions())
}
