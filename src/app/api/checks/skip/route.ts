import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SessionData, sessionOptions } from '@/lib/session';

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.userId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const { recordId, reason } = await request.json();

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: '未実施理由を入力してください' },
        { status: 400 }
      );
    }

    await prisma.dailyCheckRecord.update({
      where: { id: recordId },
      data: {
        status: 'skipped',
        skipReason: reason.trim(),
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Skip error:', error);
    return NextResponse.json({ error: 'スキップ処理に失敗しました' }, { status: 500 });
  }
}
