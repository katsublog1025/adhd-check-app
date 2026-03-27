import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SessionData, sessionOptions } from '@/lib/session';
import { getTodayString } from '@/lib/utils';
import { sendNotification } from '@/lib/mail';

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.userId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const { recordId } = await request.json();

    const record = await prisma.dailyCheckRecord.update({
      where: { id: recordId },
      data: {
        status: 'done',
        completedAt: new Date(),
      },
      include: { template: true },
    });

    // Check if all daily tasks are done
    const allRecords = await prisma.dailyCheckRecord.findMany({
      where: {
        userId: session.userId,
        targetDate: record.targetDate,
      },
    });

    const allDone = allRecords.every((r) => r.status !== 'pending');

    // If all done, send notification
    if (allDone && !session.isTestMode) {
      try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const userName = session.userName || '利用者';
        const subject = `【業務チェック完了】${userName} - ${record.targetDate}`;
        const body = `${userName}さんが${record.targetDate}の全業務チェックを完了しました。\n\n完了項目数: ${allRecords.length}件`;

        const result = await sendNotification({ to: adminEmail, subject, body });

        await prisma.notificationLog.create({
          data: {
            userId: session.userId,
            type: 'daily_complete',
            targetDate: record.targetDate,
            emailTo: adminEmail,
            subject,
            body,
            status: 'sent',
          },
        });

        return NextResponse.json({ success: true, allDone, previewUrl: result.previewUrl });
      } catch (emailError) {
        console.error('Email error:', emailError);
        // メール失敗してもチェック完了は成功扱い
      }
    }

    return NextResponse.json({ success: true, allDone });
  } catch (error) {
    console.error('Complete error:', error);
    return NextResponse.json({ error: '完了処理に失敗しました' }, { status: 500 });
  }
}
