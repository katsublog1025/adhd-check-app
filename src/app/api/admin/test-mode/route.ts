import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SessionData, sessionOptions } from '@/lib/session';

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.userId || session.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  const { userId } = await request.json();

  // Get the target user
  const targetUser = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findFirst({ where: { role: 'user' } });

  if (!targetUser) {
    return NextResponse.json({ error: '利用者が見つかりません' }, { status: 404 });
  }

  // Update session to test mode
  session.isTestMode = true;
  session.userId = targetUser.id;
  session.userName = targetUser.name;
  await session.save();

  return NextResponse.json({
    success: true,
    testUser: { id: targetUser.id, name: targetUser.name },
  });
}

export async function DELETE() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  // Restore admin session
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (admin) {
    session.userId = admin.id;
    session.userName = admin.name;
    session.role = 'admin';
    session.isTestMode = false;
    await session.save();
  }

  return NextResponse.json({ success: true });
}
