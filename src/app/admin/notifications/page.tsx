'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Notification {
  id: number;
  userName: string;
  type: string;
  targetDate: string;
  sentAt: string;
  emailTo: string;
  subject: string;
  status: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (!res.ok) { router.push('/'); return; }
      const data = await res.json();
      setNotifications(data.notifications);
    } catch {
      console.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="header">
        <div className="header-title">通知履歴</div>
      </div>

      <div className="admin-nav">
        <Link href="/admin" className="admin-nav-item">ダッシュボード</Link>
        <Link href="/admin/users" className="admin-nav-item">利用者管理</Link>
        <Link href="/admin/templates" className="admin-nav-item">テンプレート管理</Link>
        <span className="admin-nav-item active">通知履歴</span>
        <Link href="/admin/test-mode" className="admin-nav-item">テストモード</Link>
      </div>

      {notifications.length === 0 ? (
        <p className="text-secondary text-center mt-24">通知履歴がありません</p>
      ) : (
        notifications.map((n) => (
          <div key={n.id} className="notification-item">
            <div className="notification-info">
              <div className="notification-subject">{n.subject}</div>
              <div className="notification-meta">
                {n.userName} | {n.targetDate} | {new Date(n.sentAt).toLocaleString('ja-JP')}
              </div>
              <div className="notification-meta">
                送信先: {n.emailTo} | 種別: {n.type === 'daily_complete' ? '日次完了' : '週次完了'}
              </div>
            </div>
            <span className={`badge ${n.status === 'sent' ? 'badge-done' : 'badge-skipped'}`}>
              {n.status === 'sent' ? '送信済み' : '失敗'}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
