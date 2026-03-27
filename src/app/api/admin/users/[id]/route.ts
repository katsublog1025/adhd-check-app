import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SessionData, sessionOptions } from '@/lib/session';
import { getDaysInMonth, getWeekRange } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.userId || session.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  const view = request.nextUrl.searchParams.get('view') || 'daily';
  const dateParam = request.nextUrl.searchParams.get('date');
  const monthParam = request.nextUrl.searchParams.get('month');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: '利用者が見つかりません' }, { status: 404 });
  }

  if (view === 'daily') {
    const targetDate = dateParam || new Date().toISOString().split('T')[0];
    const records = await prisma.dailyCheckRecord.findMany({
      where: { userId, targetDate },
      include: { template: true },
      orderBy: { template: { sortOrder: 'asc' } },
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name },
      view: 'daily',
      targetDate,
      records: records.map((r) => ({
        id: r.id,
        title: r.template.title,
        category: r.template.category,
        status: r.status,
        completedAt: r.completedAt,
        skipReason: r.skipReason,
      })),
    });
  }

  if (view === 'weekly') {
    const targetDate = dateParam || new Date().toISOString().split('T')[0];
    const { weekStart, weekEnd } = getWeekRange(targetDate);
    
    const records = await prisma.dailyCheckRecord.findMany({
      where: {
        userId,
        targetDate: { gte: weekStart, lte: weekEnd },
      },
      include: { template: true },
      orderBy: [{ targetDate: 'asc' }, { template: { sortOrder: 'asc' } }],
    });

    const weeklyCheck = await prisma.weeklyCheckRecord.findFirst({
      where: { userId, weekStart },
    });

    // Group by date
    const byDate: Record<string, any[]> = {};
    for (const r of records) {
      if (!byDate[r.targetDate]) byDate[r.targetDate] = [];
      byDate[r.targetDate].push({
        title: r.template.title,
        status: r.status,
        skipReason: r.skipReason,
      });
    }

    return NextResponse.json({
      user: { id: user.id, name: user.name },
      view: 'weekly',
      weekStart,
      weekEnd,
      dailyByDate: byDate,
      weeklyCheck: weeklyCheck ? {
        status: weeklyCheck.status,
        completedAt: weeklyCheck.completedAt,
        memo: weeklyCheck.memo,
      } : null,
    });
  }

  if (view === 'monthly') {
    const now = new Date();
    const year = monthParam ? parseInt(monthParam.split('-')[0]) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam.split('-')[1]) : now.getMonth() + 1;
    const days = getDaysInMonth(year, month);

    const records = await prisma.dailyCheckRecord.findMany({
      where: {
        userId,
        targetDate: { gte: days[0], lte: days[days.length - 1] },
      },
    });

    // Group by date
    const daySummaries = days.map((date) => {
      const dayRecords = records.filter((r) => r.targetDate === date);
      const total = dayRecords.length;
      const done = dayRecords.filter((r) => r.status === 'done').length;
      const skipped = dayRecords.filter((r) => r.status === 'skipped').length;
      const pending = dayRecords.filter((r) => r.status === 'pending').length;

      let dayStatus = 'none'; // no records
      if (total > 0) {
        if (pending === 0 && skipped === 0) dayStatus = 'complete';
        else if (pending === 0 && skipped > 0) dayStatus = 'has_skipped';
        else if (done > 0 || skipped > 0) dayStatus = 'partial';
        else dayStatus = 'not_started';
      }

      return { date, total, done, skipped, pending, status: dayStatus };
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name },
      view: 'monthly',
      year,
      month,
      days: daySummaries,
    });
  }

  return NextResponse.json({ error: '不正なビューパラメータ' }, { status: 400 });
}
