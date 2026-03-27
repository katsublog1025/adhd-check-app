import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SessionData, sessionOptions } from '@/lib/session';
import { getWeekRange, getTodayString } from '@/lib/utils';
import { sendNotification } from '@/lib/mail';

export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { weekStart } = getWeekRange(getTodayString());

  const record = await prisma.weeklyCheckRecord.findFirst({
    where: { userId: session.userId, weekStart },
  });

  return NextResponse.json({
    weekStart,
    record: record ? {
      status: record.status,
      completedAt: record.completedAt,
      memo: record.memo,
    } : null,
  });
}

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { memo, status } = await request.json();
  const { weekStart, weekEnd } = getWeekRange(getTodayString());

  const record = await prisma.weeklyCheckRecord.upsert({
    where: {
      userId_weekStart: {
        userId: session.userId,
        weekStart,
      },
    },
    update: {
      status: status || 'done',
      completedAt: new Date(),
      memo,
    },
    create: {
      userId: session.userId,
      weekStart,
      weekEnd,
      status: status || 'done',
      completedAt: new Date(),
      memo,
    },
  });

  // Send weekly notification
  if (!session.isTestMode && status === 'done') {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
      const userName = session.userName || '利用者';
      const subject = `【週次確認完了】${userName} - ${weekStart}〜${weekEnd}`;
      const body = `${userName}さんが${weekStart}〜${weekEnd}の週次確認を完了しました。\n\nメモ: ${memo || 'なし'}`;

      await sendNotification({ to: adminEmail, subject, body });

      await prisma.notificationLog.create({
        data: {
          userId: session.userId,
          type: 'weekly_complete',
          targetDate: weekStart,
          emailTo: adminEmail,
          subject,
          body,
          status: 'sent',
        },
      });
    } catch (e) {
      console.error('Weekly notification error:', e);
    }
  }

  return NextResponse.json({ success: true, record });
}
