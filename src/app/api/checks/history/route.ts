import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.userId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '30');

  const records = await prisma.dailyCheckRecord.findMany({
    where: { userId: session.userId },
    include: { template: true },
    orderBy: [{ targetDate: 'desc' }, { template: { sortOrder: 'asc' } }],
    take: limit * 12, // Approximate max records per day
  });

  // Group by date
  const grouped: Record<string, typeof records> = {};
  for (const r of records) {
    if (!grouped[r.targetDate]) grouped[r.targetDate] = [];
    grouped[r.targetDate].push(r);
  }

  const dates = Object.keys(grouped).sort().reverse().slice(0, limit);

  return NextResponse.json({
    history: dates.map((date) => ({
      date,
      records: grouped[date].map((r) => ({
        id: r.id,
        title: r.template.title,
        category: r.template.category,
        status: r.status,
        completedAt: r.completedAt,
        skipReason: r.skipReason,
      })),
      totalCount: grouped[date].length,
      completedCount: grouped[date].filter((r) => r.status === 'done').length,
      skippedCount: grouped[date].filter((r) => r.status === 'skipped').length,
    })),
  });
}
