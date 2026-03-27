import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SessionData, sessionOptions } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { loginId, password } = await request.json();

    const user = await prisma.user.findUnique({
      where: { loginId },
    });

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'ログインIDまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    session.userId = user.id;
    session.userName = user.name;
    session.role = user.role;
    session.isTestMode = false;
    await session.save();

    return NextResponse.json({
      id: user.id,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'ログインに失敗しました' }, { status: 500 });
  }
}
