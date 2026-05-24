'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LoginRecord {
  id: number;
  userId: number;
  userName: string;
  userLoginId: string;
  loginAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

interface UserOption {
  id: number;
  name: string;
  loginId: string;
  lastLoginAt: string | null;
}

export default function LoginHistoryPage() {
  const [histories, setHistories] = useState<LoginRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [selectedUserId]);

  const checkSession = async () => {
    const res = await fetch('/api/auth/session');
    const session = await res.json();
    if (!session.authenticated || session.role !== 'admin') {
      router.push('/');
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedUserId) params.set('userId', selectedUserId);
      params.set('limit', '100');

      const res = await fetch(`/api/admin/login-history?${params}`);
      if (!res.ok) {
        router.push('/');
        return;
      }
      const data = await res.json();
      setHistories(data.histories);
      setUsers(data.users);
    } catch {
      console.error('Failed to fetch login history');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'たった今';
    if (diffMin < 60) return `${diffMin}分前`;
    if (diffHour < 24) return `${diffHour}時間前`;
    if (diffDay < 7) return `${diffDay}日前`;
    return '';
  };

  const shortenUserAgent = (ua: string | null) => {
    if (!ua) return '-';
    // Extract browser name
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    return 'その他';
  };

  return (
    <div className="admin-container">
      <div className="header">
        <div className="header-title">ログイン履歴</div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => router.push('/admin')}>
            ダッシュボードへ
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="admin-nav">
        <Link href="/admin" className="admin-nav-item">ダッシュボード</Link>
        <Link href="/admin/users" className="admin-nav-item">利用者管理</Link>
        <Link href="/admin/templates" className="admin-nav-item">テンプレート管理</Link>
        <Link href="/admin/notifications" className="admin-nav-item">通知履歴</Link>
        <span className="admin-nav-item active">ログイン履歴</span>
        <Link href="/admin/test-mode" className="admin-nav-item">テストモード</Link>
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="flex-between">
          <label className="form-label" style={{ marginBottom: 0 }}>利用者で絞り込み</label>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '200px' }}
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">全員</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}（{u.loginId}）
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : histories.length === 0 ? (
        <p className="text-secondary text-center mt-24">ログイン履歴がありません</p>
      ) : (
        <div>
          <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
            {histories.length}件のログイン履歴
          </p>
          {histories.map((record) => (
            <div key={record.id} className="login-history-item">
              <div className="login-history-main">
                <div className="login-history-user">
                  <span className="login-history-name">{record.userName}</span>
                  <span className="login-history-login-id">{record.userLoginId}</span>
                </div>
                <div className="login-history-time">
                  <span className="login-history-datetime">{formatDateTime(record.loginAt)}</span>
                  {formatRelativeTime(record.loginAt) && (
                    <span className="login-history-relative">{formatRelativeTime(record.loginAt)}</span>
                  )}
                </div>
              </div>
              <div className="login-history-meta">
                <span>🌐 {shortenUserAgent(record.userAgent)}</span>
                <span>📍 {record.ipAddress || '-'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
