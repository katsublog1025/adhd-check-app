import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId || session.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      loginId: true,
      role: true,
      email: true,
      createdAt: true,
    },
    orderBy: { id: 'asc' }
  });

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId || session.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  const { name, loginId, password, role, email } = await request.json();

  if (!name || !loginId || !password) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
  }

  // 既存のloginIdチェック
  const existingUser = await prisma.user.findUnique({ where: { loginId } });
  if (existingUser) {
    return NextResponse.json({ error: 'このログインIDは既に使用されています' }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      name,
      loginId,
      password,
      role: role || 'user',
      email: email || null,
    },
    select: { id: true, name: true, loginId: true, role: true, email: true }
  });

  return NextResponse.json({ user });
}

export async function PUT(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId || session.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  const { id, name, loginId, password, role, email } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'IDが指定されていません' }, { status: 400 });
  }

  if (loginId) {
    const existingUser = await prisma.user.findUnique({ where: { loginId } });
    if (existingUser && existingUser.id !== id) {
      return NextResponse.json({ error: 'このログインIDは既に使用されています' }, { status: 400 });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(loginId !== undefined && { loginId }),
      ...(password && { password }), // パスワードは空でなければ更新
      ...(role !== undefined && { role }),
      ...(email !== undefined && { email }),
    },
    select: { id: true, name: true, loginId: true, role: true, email: true }
  });

  return NextResponse.json({ user });
}

export async function DELETE(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId || session.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'IDが指定されていません' }, { status: 400 });
  }
  
  // 自分自身を削除できないように保護
  if (id === session.userId) {
     return NextResponse.json({ error: '現在ログイン中のアカウントは削除できません' }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
