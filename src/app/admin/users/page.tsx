'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  loginId: string;
  role: string;
  email: string | null;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    loginId: '',
    password: '',
    role: 'user',
    email: '',
  });
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      if (!session.authenticated || session.role !== 'admin') {
        router.push('/');
        return;
      }

      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users);
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    const method = editingId ? 'PUT' : 'POST';
    const body = editingId ? { id: editingId, ...formData } : formData;

    // パスワードが空の場合、新規作成時はエラー、編集時は変更なしとして扱う
    if (!editingId && !formData.password) {
      setErrorMsg('パスワードは必須です');
      return;
    }

    const res = await fetch('/api/admin/users', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', loginId: '', password: '', role: 'user', email: '' });
      fetchUsers();
    } else {
      const data = await res.json();
      setErrorMsg(data.error || 'エラーが発生しました');
    }
  };

  const handleEdit = (u: User) => {
    setEditingId(u.id);
    setFormData({
      name: u.name,
      loginId: u.loginId,
      password: '', // 編集時は空（変更する場合のみ入力）
      role: u.role,
      email: u.email || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('本当にこのユーザーを削除しますか？紐づく全ての履歴データも削除されます。')) return;

    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      fetchUsers();
    } else {
      const data = await res.json();
      alert(data.error || '削除に失敗しました');
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
        <div className="header-title">利用者管理</div>
      </div>

      <div className="admin-nav">
        <Link href="/admin" className="admin-nav-item">ダッシュボード</Link>
        <span className="admin-nav-item active">利用者管理</span>
        <Link href="/admin/templates" className="admin-nav-item">テンプレート管理</Link>
        <Link href="/admin/notifications" className="admin-nav-item">通知履歴</Link>
        <Link href="/admin/test-mode" className="admin-nav-item">テストモード</Link>
      </div>

      <button
        className="btn btn-primary mb-16"
        onClick={() => {
          setShowForm(true);
          setEditingId(null);
          setFormData({ name: '', loginId: '', password: '', role: 'user', email: '' });
          setErrorMsg('');
        }}
      >
        + 新規追加
      </button>

      {/* Add/Edit Form Modal essentially */}
      {showForm && (
        <div className="card mb-16" style={{ border: '2px solid var(--color-primary)' }}>
          <h3 className="card-title">{editingId ? 'ユーザー編集' : '新規ユーザー追加'}</h3>
          {errorMsg && <div style={{ color: 'red', marginBottom: '10px' }}>{errorMsg}</div>}
          
          <div className="form-group">
            <label className="form-label">名前 (表示名)</label>
            <input
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例: 佐藤 健"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">ログインID</label>
            <input
              className="form-input"
              value={formData.loginId}
              onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
              placeholder="例: sato_takeshi"
            />
          </div>

          <div className="form-group">
            <label className="form-label">パスワード {editingId && <span style={{fontSize: '0.8rem', color: '#666'}}>(変更しない場合は空欄)</span>}</label>
            <input
              className="form-input"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="パスワードを入力"
            />
          </div>

          <div className="form-group">
            <label className="form-label">権限</label>
            <select
              className="form-select"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="user">利用者 (user)</option>
              <option value="admin">管理者 (admin)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">メールアドレス (任意)</label>
            <input
              className="form-input"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="通知などの宛先"
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingId ? '更新する' : '追加する'}
            </button>
            <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditingId(null); setErrorMsg(''); }}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* User List */}
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>登録ユーザー一覧</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {users.map((u) => (
          <div key={u.id} className="user-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{u.name}</span>
                {u.role === 'admin' && <span className="badge badge-complete">管理者</span>}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                ID: {u.loginId} {u.email && `| Email: ${u.email}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-small btn-outline" onClick={() => handleEdit(u)}>
                編集
              </button>
              <button className="btn btn-small btn-danger" onClick={() => handleDelete(u.id)}>
                削除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
