import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SessionData, sessionOptions } from '@/lib/session';
import { getTodayString } from '@/lib/utils';

// 日付文字列から週の月曜日を返す
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}

// 日付文字列から月 (YYYY-MM) を返す
function getMonth(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const today = getTodayString();

  // 直近90日分のレコードを取得（月次6ヶ月をカバー）
  const since = new Date(today);
  since.setDate(since.getDate() - 180);
  const sinceStr = since.toISOString().slice(0, 10);

  const records = await prisma.dailyCheckRecord.findMany({
    where: {
      userId: session.userId,
      targetDate: { gte: sinceStr },
    },
    orderBy: { targetDate: 'asc' },
  });

  // --- 日次 (直近30日) ---
  const dayMap: Record<string, { done: number; total: number }> = {};
  for (const r of records) {
    if (!dayMap[r.targetDate]) dayMap[r.targetDate] = { done: 0, total: 0 };
    dayMap[r.targetDate].total++;
    if (r.status === 'done') dayMap[r.targetDate].done++;
  }

  const allDates = Object.keys(dayMap).sort().reverse();
  const dailyDays = allDates.slice(0, 30).map((date) => ({
    label: date,
    rate: dayMap[date].total > 0
      ? Math.round((dayMap[date].done / dayMap[date].total) * 100)
      : 0,
    completedCount: dayMap[date].done,
    totalCount: dayMap[date].total,
  })).reverse(); // 古い順に

  const todayData = dayMap[today] || { done: 0, total: 0 };
  const todayRate = todayData.total > 0
    ? Math.round((todayData.done / todayData.total) * 100)
    : null; // nullはまだ記録なし

  // --- 週次 (直近8週) ---
  const weekMap: Record<string, { done: number; total: number }> = {};
  for (const r of records) {
    const ws = getWeekStart(r.targetDate);
    if (!weekMap[ws]) weekMap[ws] = { done: 0, total: 0 };
    weekMap[ws].total++;
    if (r.status === 'done') weekMap[ws].done++;
  }

  const allWeeks = Object.keys(weekMap).sort().reverse();
  const weeklyWeeks = allWeeks.slice(0, 8).map((ws) => ({
    label: ws,
    rate: weekMap[ws].total > 0
      ? Math.round((weekMap[ws].done / weekMap[ws].total) * 100)
      : 0,
    completedCount: weekMap[ws].done,
    totalCount: weekMap[ws].total,
  })).reverse();

  const thisWeekStart = getWeekStart(today);
  const thisWeekData = weekMap[thisWeekStart] || { done: 0, total: 0 };
  const thisWeekRate = thisWeekData.total > 0
    ? Math.round((thisWeekData.done / thisWeekData.total) * 100)
    : null;

  // --- 月次 (直近6ヶ月) ---
  const monthMap: Record<string, { done: number; total: number }> = {};
  for (const r of records) {
    const m = getMonth(r.targetDate);
    if (!monthMap[m]) monthMap[m] = { done: 0, total: 0 };
    monthMap[m].total++;
    if (r.status === 'done') monthMap[m].done++;
  }

  const allMonths = Object.keys(monthMap).sort().reverse();
  const monthlyMonths = allMonths.slice(0, 6).map((m) => ({
    label: m,
    rate: monthMap[m].total > 0
      ? Math.round((monthMap[m].done / monthMap[m].total) * 100)
      : 0,
    completedCount: monthMap[m].done,
    totalCount: monthMap[m].total,
  })).reverse();

  const thisMonth = getMonth(today);
  const thisMonthData = monthMap[thisMonth] || { done: 0, total: 0 };
  const thisMonthRate = thisMonthData.total > 0
    ? Math.round((thisMonthData.done / thisMonthData.total) * 100)
    : null;

  return NextResponse.json({
    daily: {
      current: {
        rate: todayRate,
        completedCount: todayData.done,
        totalCount: todayData.total,
        label: today,
      },
      bars: dailyDays,
    },
    weekly: {
      current: {
        rate: thisWeekRate,
        completedCount: thisWeekData.done,
        totalCount: thisWeekData.total,
        label: thisWeekStart,
      },
      bars: weeklyWeeks,
    },
    monthly: {
      current: {
        rate: thisMonthRate,
        completedCount: thisMonthData.done,
        totalCount: thisMonthData.total,
        label: thisMonth,
      },
      bars: monthlyMonths,
    },
  });
}
