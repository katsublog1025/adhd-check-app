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

  const templates = await prisma.taskTemplate.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId || session.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  const { title, category, sortOrder, isWeekly } = await request.json();

  if (!title || !category) {
    return NextResponse.json({ error: 'タイトルと区分は必須です' }, { status: 400 });
  }

  const template = await prisma.taskTemplate.create({
    data: {
      title,
      category,
      sortOrder: sortOrder || 99,
      isWeekly: isWeekly || false,
    },
  });

  return NextResponse.json({ template });
}

export async function PUT(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId || session.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  const { id, title, category, sortOrder, isWeekly, isActive } = await request.json();

  const template = await prisma.taskTemplate.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isWeekly !== undefined && { isWeekly }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json({ template });
}

export async function DELETE(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId || session.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  const { id } = await request.json();

  await prisma.taskTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
