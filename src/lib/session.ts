import { SessionOptions } from 'iron-session';

export interface SessionData {
  userId?: number;
  userName?: string;
  role?: string;
  isTestMode?: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD || 'adhd-check-app-super-secret-password-min-32-chars!',
  cookieName: 'adhd-check-session',
  cookieOptions: {
    secure: false, // localhost用
    httpOnly: true,
    sameSite: 'lax' as const,
  },
};
