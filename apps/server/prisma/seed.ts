import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('password', 10)

  const user = await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: {},
    create: {
      email: 'dev@example.com',
      passwordHash,
      name: 'Dev User',
    },
  })

  await prisma.channel.upsert({
    where: {
      userId_name: {
        userId: user.id,
        name: 'my-first-webhook',
      },
    },
    update: {},
    create: {
      name: 'my-first-webhook',
      userId: user.id,
    },
  })

  console.log('Seed completed. Dev credentials: dev@example.com / password')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
