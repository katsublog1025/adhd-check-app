'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'ログインに失敗しました');
        return;
      }

      if (data.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/user');
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <h1 className="login-title">業務チェック</h1>
        <p className="login-subtitle">ログインして今日のチェックを始めましょう</p>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label className="form-label" htmlFor="loginId">ログインID</label>
          <input
            id="loginId"
            className="form-input"
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="例: yamada"
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">パスワード</label>
          <input
            id="password"
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            required
          />
        </div>

        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>

      </form>
    </div>
  );
}
