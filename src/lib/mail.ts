import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export async function getTransporter() {
  if (transporter) return transporter;

  // Ethereal Email - テスト用の仮想メールアカウントを自動生成
  const testAccount = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log('📧 Ethereal Email Account:', testAccount.user);
  console.log('📧 Ethereal Web: https://ethereal.email/login');

  return transporter;
}

export async function sendNotification(options: {
  to: string;
  subject: string;
  body: string;
}) {
  const transport = await getTransporter();

  const info = await transport.sendMail({
    from: '"ADHD業務チェック" <noreply@adhd-check.local>',
    to: options.to,
    subject: options.subject,
    text: options.body,
  });

  // Etherealのプレビュー URL
  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log('📧 メール送信完了 Preview:', previewUrl);

  return {
    messageId: info.messageId,
    previewUrl,
  };
}
