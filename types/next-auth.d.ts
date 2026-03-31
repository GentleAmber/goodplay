import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface User extends DefaultUser {
    role: string
    banned: boolean
    bannedUntil: string | null
    
  }

  interface Session {
    user: {
      id: string
      role: string
      banned: boolean
      bannedUntil: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    role: string
    banned: boolean
    bannedUntil: string | null
  }
}
