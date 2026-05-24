'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DayStatus {
  date: string;
  total: number;
  done: number;
  skipped: number;
  pending: number;
  status: string;
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const router = useRouter();

  useEffect(() => {
    const now = new Date();
    setSelectedDate(now.toISOString().split('T')[0]);
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  useEffect(() => {
    if (selectedDate || selectedMonth) fetchData();
  }, [view, selectedDate, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/users/${id}?view=${view}`;
      if (view === 'daily') url += `&date=${selectedDate}`;
      if (view === 'weekly') url += `&date=${selectedDate}`;
      if (view === 'monthly') url += `&month=${selectedMonth}`;

      const res = await fetch(url);
      if (!res.ok) { router.push('/admin'); return; }
      setData(await res.json());
    } catch {
      console.error('Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'done') return '✅';
    if (status === 'skipped') return '⚠️';
    return '⬜';
  };

  const weekDays = ['月', '火', '水', '木', '金', '土', '日'];

  const renderMonthlyCalendar = () => {
    if (!data?.days) return null;
    const firstDay = new Date(data.days[0].date + 'T00:00:00');
    let startDow = firstDay.getDay();
    if (startDow === 0) startDow = 7;
    const emptyCells = startDow - 1;

    return (
      <div className="card">
        <div className="flex-between mb-16">
          <button className="btn btn-ghost" onClick={() => {
            const [y, m] = selectedMonth.split('-').map(Number);
            const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
            setSelectedMonth(prev);
          }}>◀</button>
          <span style={{ fontWeight: 700 }}>{data.year}年{data.month}月</span>
          <button className="btn btn-ghost" onClick={() => {
            const [y, m] = selectedMonth.split('-').map(Number);
            const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
            setSelectedMonth(next);
          }}>▶</button>
        </div>

        <div className="calendar-grid">
          {weekDays.map((d) => (
            <div key={d} className="calendar-header">{d}</div>
          ))}
          {Array.from({ length: emptyCells }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty"></div>
          ))}
          {data.days.map((day: DayStatus) => (
            <div
              key={day.date}
              className={`calendar-day ${day.status}`}
              title={`${day.date}: ${day.done}完了 / ${day.skipped}未実施 / ${day.pending}未着手`}
              onClick={() => { setSelectedDate(day.date); setView('daily'); }}
            >
              {parseInt(day.date.split('-')[2])}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '16px', fontSize: '0.8rem', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span><span className="calendar-day complete" style={{ display: 'inline', padding: '2px 6px' }}>■</span> 全完了</span>
          <span><span className="calendar-day has_skipped" style={{ display: 'inline', padding: '2px 6px' }}>■</span> 未実施あり</span>
          <span><span className="calendar-day partial" style={{ display: 'inline', padding: '2px 6px' }}>■</span> 一部完了</span>
          <span><span className="calendar-day not_started" style={{ display: 'inline', padding: '2px 6px' }}>■</span> 未着手</span>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-container">
      <div className="header">
        <div className="header-title">
          <Link href="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>← </Link>
          {data?.user?.name || '利用者詳細'}
        </div>
      </div>

      {/* View Tabs */}
      <div className="nav-tabs">
        <button className={`nav-tab ${view === 'daily' ? 'active' : ''}`} onClick={() => setView('daily')}>日次</button>
        <button className={`nav-tab ${view === 'weekly' ? 'active' : ''}`} onClick={() => setView('weekly')}>週次</button>
        <button className={`nav-tab ${view === 'monthly' ? 'active' : ''}`} onClick={() => setView('monthly')}>月次</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : (
        <>
          {/* Daily View */}
          {view === 'daily' && data && (
            <div>
              <div className="flex-between mb-16">
                <button className="btn btn-ghost" onClick={() => {
                  const d = new Date(selectedDate + 'T00:00:00');
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}>◀ 前日</button>
                <span style={{ fontWeight: 600 }}>{data.targetDate}</span>
                <button className="btn btn-ghost" onClick={() => {
                  const d = new Date(selectedDate + 'T00:00:00');
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}>翌日 ▶</button>
              </div>

              <div className="card">
                {data.records.length === 0 && (
                  <p className="text-secondary text-center">この日のレコードはありません</p>
                )}
                {data.records.map((r: any) => (
                  <div key={r.id} className="history-item">
                    <span className="history-item-icon">{statusIcon(r.status)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="history-item-title">{r.title}</span>
                        {r.completedAt && (
                          <span className="history-item-time">
                            {new Date(r.completedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      {r.skipReason && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-warning)' }}>
                          理由: {r.skipReason}
                        </div>
                      )}
                    </div>
                    <span className="badge" style={{
                      background: r.status === 'done' ? 'var(--color-success-light)' : r.status === 'skipped' ? 'var(--color-warning-light)' : '#F3F4F6',
                      color: r.status === 'done' ? 'var(--color-success)' : r.status === 'skipped' ? 'var(--color-warning)' : 'var(--color-text-secondary)',
                    }}>
                      {r.status === 'done' ? '完了' : r.status === 'skipped' ? '未実施' : '未着手'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly View */}
          {view === 'weekly' && data && (
            <div>
              <div className="card">
                <h3 className="card-title">{data.weekStart} 〜 {data.weekEnd}</h3>
                {data.dailyByDate && Object.entries(data.dailyByDate).map(([date, records]: [string, any]) => (
                  <div key={date} style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>{date}</div>
                    {records.map((r: any, i: number) => (
                      <div key={i} className="history-item">
                        <span className="history-item-icon">{statusIcon(r.status)}</span>
                        <span className="history-item-title">{r.title}</span>
                        {r.completedAt && (
                          <span className="history-item-time">
                            {new Date(r.completedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 className="card-title">週次確認</h3>
                {data.weeklyCheck ? (
                  <div>
                    <span className="badge badge-done">
                      {data.weeklyCheck.status === 'done' ? '提出済み' : data.weeklyCheck.status}
                    </span>
                    {data.weeklyCheck.memo && (
                      <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>{data.weeklyCheck.memo}</p>
                    )}
                  </div>
                ) : (
                  <span className="badge badge-pending">未提出</span>
                )}
              </div>
            </div>
          )}

          {/* Monthly View */}
          {view === 'monthly' && renderMonthlyCalendar()}
        </>
      )}
    </div>
  );
}
