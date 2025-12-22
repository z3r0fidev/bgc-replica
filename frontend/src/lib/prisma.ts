import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is not set')
  } else {
    console.warn('DATABASE_URL is not set. PrismaClient may fail to initialize.')
  }
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma