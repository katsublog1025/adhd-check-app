import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.userId || session.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  const userIdParam = request.nextUrl.searchParams.get('userId');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');

  const where = userIdParam ? { userId: parseInt(userIdParam) } : {};

  const histories = await prisma.loginHistory.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, loginId: true },
      },
    },
    orderBy: { loginAt: 'desc' },
    take: limit,
  });

  // 全ユーザーリスト（フィルタ用）
  const users = await prisma.user.findMany({
    where: { role: 'user' },
    select: { id: true, name: true, loginId: true, lastLoginAt: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    histories: histories.map((h) => ({
      id: h.id,
      userId: h.userId,
      userName: h.user.name,
      userLoginId: h.user.loginId,
      loginAt: h.loginAt,
      ipAddress: h.ipAddress,
      userAgent: h.userAgent,
    })),
    users,
  });
}
