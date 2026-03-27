import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SessionData, sessionOptions } from '@/lib/session';
import { getTodayString } from '@/lib/utils';

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.userId || session.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  const today = getTodayString();

  // Get all users (non-admin)
  const users = await prisma.user.findMany({
    where: { role: 'user' },
  });

  // Get today's records for all users
  const todayRecords = await prisma.dailyCheckRecord.findMany({
    where: { targetDate: today },
    include: { template: true, user: true },
    orderBy: { template: { sortOrder: 'asc' } },
  });

  // Group by user
  const userSummaries = users.map((user) => {
    const userRecords = todayRecords.filter((r) => r.userId === user.id);
    const totalCount = userRecords.length;
    const completedCount = userRecords.filter((r) => r.status === 'done').length;
    const skippedCount = userRecords.filter((r) => r.status === 'skipped').length;
    const pendingCount = userRecords.filter((r) => r.status === 'pending').length;

    return {
      userId: user.id,
      userName: user.name,
      totalCount,
      completedCount,
      skippedCount,
      pendingCount,
      allDone: totalCount > 0 && pendingCount === 0,
      records: userRecords.map((r) => ({
        id: r.id,
        title: r.template.title,
        category: r.template.category,
        status: r.status,
        completedAt: r.completedAt,
        skipReason: r.skipReason,
      })),
    };
  });

  return NextResponse.json({
    today,
    users: userSummaries,
  });
}
