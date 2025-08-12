import { PrismaClient } from '@prisma/client';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL is not set.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const total = await prisma.inviteCode.count();
    const available = await prisma.inviteCode.count({ where: { currentUses: { lt: undefined as any } } }).catch(async () => {
      // Fallback because lt with undefined is invalid: re-query with explicit condition
      return prisma.inviteCode.count({ where: { currentUses: { lt: 999999999 } } });
    });
    const usedUp = await prisma.inviteCode.count({ where: { currentUses: { gte: undefined as any } } }).catch(async () => {
      // Fallback: approximate by counting those where currentUses >= maxUses
      const rows = await prisma.inviteCode.findMany({ select: { currentUses: true, maxUses: true } });
      return rows.filter((r) => (r.currentUses ?? 0) >= (r.maxUses ?? 0)).length;
    });

    // Aggregate sums
    const agg = await prisma.inviteCode.groupBy({
      by: ['inviteType'],
      _sum: { currentUses: true, maxUses: true },
      _count: { _all: true },
    }).catch(async () => []);

    // Top recent codes
    const recent = await prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { code: true, currentUses: true, maxUses: true, createdAt: true, usedBy: true, usedAt: true },
    });

    // Available codes (not maxed out)
    const availableCount = (await prisma.inviteCode.findMany({ select: { currentUses: true, maxUses: true } }))
      .filter((x) => (x.currentUses ?? 0) < (x.maxUses ?? 0)).length;

    console.log('Invite Codes Summary');
    console.log('--------------------');
    console.log('Total codes:', total);
    console.log('Available (currentUses < maxUses):', availableCount);
    console.log('Used up   (currentUses >= maxUses):', Math.max(0, total - availableCount));

    const sumUses = agg.reduce((a, b) => a + (b._sum.currentUses ?? 0), 0);
    const sumMax = agg.reduce((a, b) => a + (b._sum.maxUses ?? 0), 0);
    const totalByType = agg.map((g) => ({ type: g.inviteType, count: g._count._all }));
    console.log('Total currentUses:', sumUses);
    console.log('Total maxUses    :', sumMax);
    console.log('By type          :', totalByType);

    console.log('\nRecent codes (latest 20):');
    for (const r of recent) {
      console.log(
        `${r.code}  uses: ${r.currentUses}/${r.maxUses}  created: ${r.createdAt.toISOString()}  lastUsedBy: ${r.usedBy ?? '-'}  usedAt: ${r.usedAt ?? '-'}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

