import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SessionData, sessionOptions } from '@/lib/session';
import { getTodayString } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.userId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const dateParam = request.nextUrl.searchParams.get('date');
  const targetDate = dateParam || getTodayString();

  // テストモード時は管理者のIDでも利用者として動作
  const userId = session.userId;

  // Get active daily templates (not weekly)
  const templates = await prisma.taskTemplate.findMany({
    where: { isActive: true, isWeekly: false },
    orderBy: { sortOrder: 'asc' },
  });

  // Get or create daily check records for today
  const existingRecords = await prisma.dailyCheckRecord.findMany({
    where: { userId, targetDate },
    include: { template: true },
  });

  // Create missing records
  const existingTemplateIds = existingRecords.map((r) => r.templateId);
  const missingTemplates = templates.filter((t) => !existingTemplateIds.includes(t.id));

  if (missingTemplates.length > 0) {
    await prisma.dailyCheckRecord.createMany({
      data: missingTemplates.map((t) => ({
        userId,
        templateId: t.id,
        targetDate,
        status: 'pending',
      })),
    });
  }

  // Fetch all records again
  const allRecords = await prisma.dailyCheckRecord.findMany({
    where: { userId, targetDate },
    include: { template: true },
    orderBy: { template: { sortOrder: 'asc' } },
  });

  // Find current task (first pending)
  const currentTask = allRecords.find((r) => r.status === 'pending');
  const completedCount = allRecords.filter((r) => r.status !== 'pending').length;
  const totalCount = allRecords.length;
  const allDone = !currentTask;

  return NextResponse.json({
    targetDate,
    currentTask: currentTask
      ? {
          id: currentTask.id,
          title: currentTask.template.title,
          category: currentTask.template.category,
          sortOrder: currentTask.template.sortOrder,
        }
      : null,
    completedCount,
    totalCount,
    allDone,
    records: allRecords.map((r) => ({
      id: r.id,
      title: r.template.title,
      category: r.template.category,
      status: r.status,
      completedAt: r.completedAt,
      skipReason: r.skipReason,
      sortOrder: r.template.sortOrder,
    })),
  });
}
