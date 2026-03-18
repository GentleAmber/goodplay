import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const handler = NextAuth({
  providers: [
    // https://next-auth.js.org/configuration/providers/credentials
    CredentialsProvider({
      name: "username and password",
      credentials: {
        name: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.name || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findFirst({
          where: { name: credentials.name },
        })

        if (!user) return null

        if (!await bcrypt.compare(credentials.password, user.password)) return null
        //if (user.password !== credentials.password) return null
          
        return {
          id: String(user.id),
          name: user.name,
          role: user.role,
          banned: user.banned,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days 
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.banned = user.banned
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.banned = token.banned
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})

export { handler as GET, handler as POST }
