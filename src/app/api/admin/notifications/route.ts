import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId || session.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  const notifications = await prisma.notificationLog.findMany({
    include: { user: true },
    orderBy: { sentAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      userName: n.user.name,
      type: n.type,
      targetDate: n.targetDate,
      sentAt: n.sentAt,
      emailTo: n.emailTo,
      subject: n.subject,
      status: n.status,
    })),
  });
}
