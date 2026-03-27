'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserSummary {
  userId: number;
  userName: string;
  totalCount: number;
  completedCount: number;
  skippedCount: number;
  pendingCount: number;
  allDone: boolean;
  records: {
    id: number;
    title: string;
    category: string;
    status: string;
    completedAt: string | null;
    skipReason: string | null;
  }[];
}

interface DashboardData {
  today: string;
  users: UserSummary[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      if (!session.authenticated || session.role !== 'admin') {
        router.push('/');
        return;
      }

      const res = await fetch('/api/admin/dashboard');
      const result = await res.json();
      setData(result);
    } catch {
      console.error('Failed to fetch dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const statusIcon = (status: string) => {
    if (status === 'done') return '✅';
    if (status === 'skipped') return '⚠️';
    return '⬜';
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
        <div className="header-title">管理者ダッシュボード</div>
        <div className="header-actions">
          <span className="header-user">{data?.today}</span>
          <button className="btn btn-ghost" onClick={handleLogout}>ログアウト</button>
        </div>
      </div>

      {/* Navigation */}
      <div className="admin-nav">
        <span className="admin-nav-item active">ダッシュボード</span>
        <Link href="/admin/templates" className="admin-nav-item">テンプレート管理</Link>
        <Link href="/admin/notifications" className="admin-nav-item">通知履歴</Link>
        <Link href="/admin/test-mode" className="admin-nav-item">テストモード</Link>
      </div>

      {/* User Summary Cards */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
        利用者の本日の状況
      </h2>

      {data?.users.map((user) => (
        <div key={user.userId} className="user-card">
          <div
            className="user-card-header"
            onClick={() => setExpandedUser(expandedUser === user.userId ? null : user.userId)}
          >
            <span className="user-card-name">{user.userName}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {user.allDone ? (
                <span className="badge badge-complete">全完了</span>
              ) : user.totalCount === 0 ? (
                <span className="badge badge-pending">未着手</span>
              ) : (
                <span className="badge badge-pending">
                  {user.completedCount + user.skippedCount}/{user.totalCount}
                </span>
              )}
              <Link
                href={`/admin/users/${user.userId}`}
                className="btn btn-small btn-outline"
                onClick={(e) => e.stopPropagation()}
              >
                詳細
              </Link>
            </div>
          </div>

          {/* Progress */}
          {user.totalCount > 0 && (
            <div className="check-progress-bar" style={{ marginTop: '8px' }}>
              <div
                className="check-progress-fill"
                style={{
                  width: `${((user.completedCount + user.skippedCount) / user.totalCount) * 100}%`,
                  background: user.skippedCount > 0 ? 'var(--color-warning)' : 'var(--color-success)',
                }}
              ></div>
            </div>
          )}

          {/* Expanded details */}
          {expandedUser === user.userId && (
            <div style={{ marginTop: '12px' }}>
              {user.records.map((record) => (
                <div key={record.id} className="history-item">
                  <span className="history-item-icon">{statusIcon(record.status)}</span>
                  <span className="history-item-title">{record.title}</span>
                  {record.skipReason && (
                    <span className="history-item-reason" title={record.skipReason}>
                      {record.skipReason}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
