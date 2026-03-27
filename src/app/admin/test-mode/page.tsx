'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
}

export default function TestModePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      if (!res.ok) { router.push('/'); return; }
      const data = await res.json();
      setUsers(data.users.map((u: any) => ({ id: u.userId, name: u.userName })));
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const startTestMode = async () => {
    if (!selectedUserId) return;

    const res = await fetch('/api/admin/test-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUserId }),
    });

    if (res.ok) {
      router.push('/user');
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
        <div className="header-title">テストモード</div>
      </div>

      <div className="admin-nav">
        <Link href="/admin" className="admin-nav-item">ダッシュボード</Link>
        <Link href="/admin/users" className="admin-nav-item">利用者管理</Link>
        <Link href="/admin/templates" className="admin-nav-item">テンプレート管理</Link>
        <Link href="/admin/notifications" className="admin-nav-item">通知履歴</Link>
        <span className="admin-nav-item active">テストモード</span>
      </div>

      <div className="card">
        <h3 className="card-title">🧪 テストモード</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
          利用者を選択すると、その利用者の画面を疑似体験できます。<br />
          テストモード中は通知メールは送信されません。
        </p>

        <div className="form-group">
          <label className="form-label">利用者を選択</label>
          <select
            className="form-select"
            value={selectedUserId || ''}
            onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
          >
            <option value="">選択してください</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={startTestMode}
          disabled={!selectedUserId}
        >
          テストモードを開始
        </button>
      </div>
    </div>
  );
}
