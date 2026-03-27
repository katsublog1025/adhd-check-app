import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SessionData, sessionOptions } from '@/lib/session';

export async function PUT(request: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.userId || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { templates } = await request.json();

    if (!Array.isArray(templates)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Prisma Transactionを利用して、全アイテムのsortOrderを一括更新
    await prisma.$transaction(
      templates.map((template: { id: number; sortOrder: number }) =>
        prisma.taskTemplate.update({
          where: { id: template.id },
          data: { sortOrder: template.sortOrder },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reorder error:', error);
    return NextResponse.json(
      { error: 'Failed to reorder templates' },
      { status: 500 }
    );
  }
}
