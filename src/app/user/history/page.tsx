'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HistoryRecord {
  id: number;
  title: string;
  category: string;
  status: string;
  completedAt: string | null;
  skipReason: string | null;
}

interface HistoryDay {
  date: string;
  records: HistoryRecord[];
  totalCount: number;
  completedCount: number;
  skippedCount: number;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/checks/history?limit=14');
      if (!res.ok) {
        router.push('/');
        return;
      }
      const data = await res.json();
      setHistory(data.history);
    } catch {
      console.error('Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'done') return '✅';
    if (status === 'skipped') return '⚠️';
    return '⬜';
  };

  const dayBadge = (day: HistoryDay) => {
    if (day.completedCount === day.totalCount) {
      return <span className="badge badge-done">全完了</span>;
    }
    if (day.skippedCount > 0) {
      return <span className="badge badge-skipped">未実施あり</span>;
    }
    return <span className="badge badge-pending">未完了</span>;
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
      <div className="header">
        <div className="header-title">実施履歴</div>
        <button className="btn btn-ghost" onClick={() => router.push('/user')}>
          チェック画面へ
        </button>
      </div>

      {history.length === 0 && (
        <p className="text-secondary text-center mt-24">履歴がありません</p>
      )}

      {history.map((day) => (
        <div key={day.date} className="history-day">
          <div className="history-date">
            <span>{day.date}</span>
            {dayBadge(day)}
          </div>
          {day.records.map((record) => (
            <div key={record.id} className="history-item">
              <span className="history-item-icon">{statusIcon(record.status)}</span>
              <span className="history-item-title">{record.title}</span>
              {record.completedAt && (
                <span className="history-item-time">
                  {new Date(record.completedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {record.skipReason && (
                <span className="history-item-reason" title={record.skipReason}>
                  理由あり
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
