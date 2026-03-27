'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface CurrentTask {
  id: number;
  title: string;
  category: string;
  sortOrder: number;
}

interface CheckData {
  targetDate: string;
  currentTask: CurrentTask | null;
  completedCount: number;
  totalCount: number;
  allDone: boolean;
}

export default function UserCheckPage() {
  const [data, setData] = useState<CheckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [skipError, setSkipError] = useState('');
  const [userName, setUserName] = useState('');
  const [isTestMode, setIsTestMode] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchSession = useCallback(async () => {
    const res = await fetch('/api/auth/session');
    if (!res.ok) {
      router.push('/');
      return;
    }
    const session = await res.json();
    setUserName(session.userName);
    setIsTestMode(session.isTestMode || false);
  }, [router]);

  const fetchTodayChecks = useCallback(async () => {
    try {
      const res = await fetch('/api/checks/today');
      if (!res.ok) {
        router.push('/');
        return;
      }
      const result = await res.json();
      setData(result);
    } catch {
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSession();
    fetchTodayChecks();
  }, [fetchSession, fetchTodayChecks]);

  const handleComplete = async () => {
    if (!data?.currentTask) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/checks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: data.currentTask.id }),
      });

      if (res.ok) {
        await fetchTodayChecks();
      }
    } catch {
      setError('完了処理に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!data?.currentTask) return;
    if (!skipReason.trim()) {
      setSkipError('理由を入力してください');
      return;
    }
    setActionLoading(true);

    try {
      const res = await fetch('/api/checks/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: data.currentTask.id, reason: skipReason }),
      });

      if (res.ok) {
        setShowSkipModal(false);
        setSkipReason('');
        setSkipError('');
        await fetchTodayChecks();
      }
    } catch {
      setError('スキップ処理に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isTestMode) {
      await fetch('/api/admin/test-mode', { method: 'DELETE' });
      router.push('/admin');
      return;
    }
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Test Mode Banner */}
      {isTestMode && (
        <div className="test-mode-banner">
          <span>🧪 テストモード</span>
          <button className="btn btn-small btn-ghost" onClick={handleLogout}>
            管理者に戻る
          </button>
        </div>
      )}

      {/* Header */}
      <div className="header">
        <div className="header-title">業務チェック</div>
        <div className="header-actions">
          <button
            className="btn btn-ghost"
            onClick={() => router.push('/user/history')}
          >
            履歴
          </button>
          <button className="btn btn-ghost" onClick={handleLogout}>
            {isTestMode ? '戻る' : 'ログアウト'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* All Done Screen */}
      {data?.allDone && (
        <div className="complete-screen">
          <div className="complete-icon">🎉</div>
          <h1 className="complete-title">本日の業務チェック完了</h1>
          <p className="complete-subtitle">
            すべてのチェック項目が完了しました。<br />お疲れさまでした！
          </p>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
            {data.completedCount} / {data.totalCount} 件完了
          </p>
        </div>
      )}

      {/* Current Task */}
      {data && !data.allDone && data.currentTask && (
        <div className="check-card">
          <div className="check-progress">
            {data.completedCount} / {data.totalCount} 件完了
          </div>
          <div className="check-progress-bar">
            <div
              className="check-progress-fill"
              style={{ width: `${(data.completedCount / data.totalCount) * 100}%` }}
            ></div>
          </div>

          <div className="check-category">{data.currentTask.category}</div>
          <h2 className="check-title">{data.currentTask.title}</h2>

          <div className="check-actions">
            <button
              className="btn btn-complete"
              onClick={handleComplete}
              disabled={actionLoading}
            >
              {actionLoading ? '処理中...' : '✓ 完了'}
            </button>

            <div className="skip-section">
              <button
                className="btn btn-skip"
                onClick={() => setShowSkipModal(true)}
                disabled={actionLoading}
              >
                未実施にする
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip Modal */}
      {showSkipModal && (
        <div className="modal-overlay" onClick={() => setShowSkipModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">未実施の理由を入力</h3>
            <textarea
              className="form-textarea"
              value={skipReason}
              onChange={(e) => { setSkipReason(e.target.value); setSkipError(''); }}
              placeholder="未実施の理由を入力してください（必須）"
              autoFocus
            />
            {skipError && <div className="form-error">{skipError}</div>}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowSkipModal(false)}>
                キャンセル
              </button>
              <button
                className="btn btn-danger"
                onClick={handleSkip}
                disabled={actionLoading}
              >
                {actionLoading ? '処理中...' : '未実施で登録'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
