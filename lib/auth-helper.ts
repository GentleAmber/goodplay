import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

export default async function getAuthUser() {
  const session = await getServerSession()
  if (!session?.user?.name) return null

  const user = await prisma.user.findFirst({
    where: { name: session.user.name },
    select: { id: true, name: true, banned: true, role: true },
  })
  if (!user) return null

  return user

} 
