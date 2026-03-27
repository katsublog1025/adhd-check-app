import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // --- Users ---
  const admin = await prisma.user.upsert({
    where: { loginId: 'admin' },
    update: {},
    create: {
      name: '管理者',
      loginId: 'admin',
      password: 'admin123',
      role: 'admin',
      email: 'admin@example.com',
    },
  });

  const user1 = await prisma.user.upsert({
    where: { loginId: 'yamada' },
    update: {},
    create: {
      name: '山田 太郎',
      loginId: 'yamada',
      password: 'user123',
      role: 'user',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { loginId: 'suzuki' },
    update: {},
    create: {
      name: '鈴木 花子',
      loginId: 'suzuki',
      password: 'user123',
      role: 'user',
    },
  });

  console.log('Users created:', admin.name, user1.name, user2.name);

  // --- Task Templates ---
  const templates = [
    { title: 'Teams 起動・オンライン確認', category: '出勤時', sortOrder: 1, isWeekly: false },
    { title: 'ZOOM 起動確認', category: '出勤時', sortOrder: 2, isWeekly: false },
    { title: '業務用電話の携帯確認', category: '出勤時', sortOrder: 3, isWeekly: false },
    { title: 'メール確認（未読・緊急案件チェック）', category: '出勤時', sortOrder: 4, isWeekly: false },
    { title: 'Teams オンライン状態の維持（中断していないか）', category: '業務中', sortOrder: 5, isWeekly: false },
    { title: '電話を手元に置いているか（離席時も携帯）', category: '業務中', sortOrder: 6, isWeekly: false },
    { title: '会員対応後、通知・メッセージ見落とし確認', category: '業務中', sortOrder: 7, isWeekly: false },
    { title: 'メール確認・返信（未返信がないか）', category: '閉店前・退勤前', sortOrder: 8, isWeekly: false },
    { title: 'Teams・ZOOM の状態確認（退勤前に適切に終了）', category: '閉店前・退勤前', sortOrder: 9, isWeekly: false },
    { title: '翌日分の連絡事項・引継ぎの確認', category: '閉店前・退勤前', sortOrder: 10, isWeekly: false },
    { title: '確認漏れ・遅延がなかったか振り返り', category: '週次確認', sortOrder: 11, isWeekly: true },
    { title: '困ったこと・サポートが必要なことを責任者に報告', category: '週次確認', sortOrder: 12, isWeekly: true },
  ];

  for (const t of templates) {
    await prisma.taskTemplate.upsert({
      where: { id: t.sortOrder },
      update: {},
      create: t,
    });
  }

  console.log('Task templates created:', templates.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
