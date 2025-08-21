import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load env from backend .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const prisma = new PrismaClient()

function parseCSVLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

function toDateOrUndefined(v: string | undefined): Date | undefined {
  if (!v) return undefined
  const s = v.trim()
  if (!s) return undefined
  // Normalize space-separated timestamp to ISO if needed
  const isoLike = /\d{4}-\d{2}-\d{2}T/.test(s) ? s : s.replace(' ', 'T')
  const d = new Date(isoLike)
  return isNaN(d.getTime()) ? undefined : d
}

async function main() {
  const csvPath = process.argv[2] || '/Users/steven/Downloads/users.csv'
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`)
    process.exit(1)
  }

  console.log(`Reading: ${csvPath}`)

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath),
    crlfDelay: Infinity,
  })

  let header: string[] | null = null
  const rows: Record<string, string>[] = []

  for await (const line of rl) {
    // Skip BOM on first line
    const cleaned = header == null ? line.replace(/^\uFEFF/, '') : line
    if (cleaned.trim() === '') continue
    const cols = parseCSVLine(cleaned)
    if (!header) {
      header = cols.map((h) => h.trim())
      continue
    }
    const rec: Record<string, string> = {}
    header.forEach((h, i) => {
      rec[h] = (cols[i] ?? '').trim()
    })
    rows.push(rec)
  }

  if (!header) {
    console.error('CSV header not found')
    process.exit(1)
  }

  console.log(`Parsed ${rows.length} data rows`)

  // Map CSV -> Prisma.User
  const users = rows.map((r) => ({
    id: r['id'] || undefined,
    phoneNumber: r['phone_number'],
    inviteCode: r['invite_code'] || undefined,
    userInviteCode: r['user_invite_code'] || undefined,
    userSequence: r['user_sequence'] ? Number(r['user_sequence']) : undefined,
    createdAt: toDateOrUndefined(r['created_at']) || undefined,
    // role uses default
  }))
  .filter((u) => !!u.phoneNumber)

  console.log(`Prepared ${users.length} users for import`)

  if (users.length === 0) {
    console.error('No valid users to import (missing phone_number)')
    process.exit(1)
  }

  // Execute within a transaction
  console.log('Connecting to database...')
  await prisma.$connect()

  try {
    console.log('Truncating table "User" with CASCADE...')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE')

    console.log('Inserting users...')
    // Use createMany for bulk insert
    const chunkSize = 1000
    let inserted = 0
    for (let i = 0; i < users.length; i += chunkSize) {
      const chunk = users.slice(i, i + chunkSize)
      const res = await prisma.user.createMany({ data: chunk, skipDuplicates: false })
      inserted += res.count
      console.log(`Inserted ${inserted}/${users.length}`)
    }

    const count = await prisma.user.count()
    console.log(`Done. Users in table: ${count}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})

