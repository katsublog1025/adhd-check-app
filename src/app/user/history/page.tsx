'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Period = 'daily' | 'weekly' | 'monthly';

interface PeriodBar {
  label: string;
  rate: number;
  completedCount: number;
  totalCount: number;
}

interface PeriodCurrent {
  rate: number | null;
  completedCount: number;
  totalCount: number;
  label: string;
}

interface PeriodData {
  current: PeriodCurrent;
  bars: PeriodBar[];
}

interface StatsData {
  daily: PeriodData;
  weekly: PeriodData;
  monthly: PeriodData;
}

function getRateColor(rate: number | null): string {
  if (rate === null) return 'var(--color-text-secondary)';
  if (rate >= 80) return 'var(--color-success)';
  if (rate >= 50) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function getRateBg(rate: number | null): string {
  if (rate === null) return '#F3F4F6';
  if (rate >= 80) return 'var(--color-success-light)';
  if (rate >= 50) return 'var(--color-warning-light)';
  return 'var(--color-danger-light)';
}

function formatLabel(label: string, period: Period): string {
  if (period === 'daily') {
    const d = new Date(label + 'T00:00:00');
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  if (period === 'weekly') {
    const d = new Date(label + 'T00:00:00');
    return `${d.getMonth() + 1}/${d.getDate()}~`;
  }
  // monthly: YYYY-MM -> M月
  const [, m] = label.split('-');
  return `${parseInt(m)}月`;
}

function formatCurrentLabel(label: string, period: Period): string {
  if (period === 'daily') {
    const d = new Date(label + 'T00:00:00');
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（今日）`;
  }
  if (period === 'weekly') {
    const d = new Date(label + 'T00:00:00');
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    return `${d.getMonth() + 1}/${d.getDate()} 〜 ${end.getMonth() + 1}/${end.getDate()}（今週）`;
  }
  const [y, m] = label.split('-');
  return `${y}年${parseInt(m)}月（今月）`;
}

// SVGバーチャート（純粋なSVG、ライブラリ不要）
function BarChart({ bars, period }: { bars: PeriodBar[]; period: Period }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const chartHeight = 120;
  const barWidth = Math.min(28, Math.floor(320 / bars.length) - 4);
  const gap = Math.max(4, Math.floor(320 / bars.length) - barWidth);
  const totalWidth = bars.length * (barWidth + gap) - gap;

  if (bars.length === 0) {
    return <p className="text-secondary text-center" style={{ padding: '24px 0' }}>データがありません</p>;
  }

  return (
    <div className="stats-chart-wrap">
      <svg
        viewBox={`0 0 ${totalWidth + 8} ${chartHeight + 32}`}
        width="100%"
        style={{ overflow: 'visible' }}
      >
        {/* グリッドライン */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = chartHeight - (pct / 100) * chartHeight;
          return (
            <line
              key={pct}
              x1={0}
              y1={y}
              x2={totalWidth + 8}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth={pct === 0 ? 1.5 : 0.8}
              strokeDasharray={pct === 0 ? '0' : '3,3'}
            />
          );
        })}

        {bars.map((bar, i) => {
          const x = i * (barWidth + gap) + 4;
          const barH = (bar.rate / 100) * chartHeight;
          const y = chartHeight - barH;
          const color = bar.rate >= 80 ? '#059669' : bar.rate >= 50 ? '#D97706' : '#DC2626';
          const isHovered = hovered === i;

          return (
            <g
              key={bar.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* バー背景 */}
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={chartHeight}
                fill={isHovered ? '#F9FAFB' : 'transparent'}
                rx={4}
              />
              {/* バー本体 */}
              <rect
                x={x}
                y={barH > 0 ? y : chartHeight - 2}
                width={barWidth}
                height={barH > 0 ? barH : 2}
                fill={color}
                rx={3}
                opacity={isHovered ? 1 : 0.85}
              />
              {/* ホバー時ツールチップ */}
              {isHovered && (
                <g>
                  <rect
                    x={x - 8}
                    y={y - 32}
                    width={barWidth + 16}
                    height={24}
                    rx={6}
                    fill="#1A1A2E"
                    opacity={0.88}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 16}
                    textAnchor="middle"
                    fill="white"
                    fontSize={11}
                    fontWeight="bold"
                  >
                    {bar.rate}%
                  </text>
                </g>
              )}
              {/* X軸ラベル */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 18}
                textAnchor="middle"
                fontSize={10}
                fill="#9CA3AF"
              >
                {formatLabel(bar.label, period)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function HistoryPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Period>('daily');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => {
        if (!res.ok) { router.push('/'); return null; }
        return res.json();
      })
      .then((data) => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    );
  }

  const periodData = stats ? stats[tab] : null;
  const current = periodData?.current;

  const tabLabels: Record<Period, string> = {
    daily: '日次',
    weekly: '週次',
    monthly: '月次',
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <div className="header-title">達成率</div>
        <button className="btn btn-ghost" onClick={() => router.push('/user')}>
          チェック画面へ
        </button>
      </div>

      {/* Tab */}
      <div className="stats-tabs">
        {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
          <button
            key={p}
            className={`stats-tab${tab === p ? ' active' : ''}`}
            onClick={() => setTab(p)}
          >
            {tabLabels[p]}
          </button>
        ))}
      </div>

      {current && (
        <>
          {/* サマリーカード */}
          <div
            className="stats-summary"
            style={{ background: getRateBg(current.rate) }}
          >
            <div className="stats-summary-period">
              {formatCurrentLabel(current.label, tab)}
            </div>
            {current.rate !== null ? (
              <>
                <div
                  className="stats-summary-rate"
                  style={{ color: getRateColor(current.rate) }}
                >
                  {current.rate}%
                </div>
                <div className="stats-summary-detail">
                  {current.completedCount} / {current.totalCount} 件完了
                </div>
                {/* 達成バー */}
                <div className="stats-summary-bar">
                  <div
                    className="stats-summary-bar-fill"
                    style={{
                      width: `${current.rate}%`,
                      background: getRateColor(current.rate),
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="stats-summary-empty">まだ記録がありません</div>
            )}
          </div>

          {/* バーチャート */}
          {periodData && periodData.bars.length > 0 && (
            <div className="stats-chart-card">
              <div className="stats-chart-title">
                {tab === 'daily' && '直近30日'}
                {tab === 'weekly' && '直近8週'}
                {tab === 'monthly' && '直近6ヶ月'}
                の推移
              </div>
              <BarChart bars={periodData.bars} period={tab} />
            </div>
          )}

          {/* 日次のみ: 凡例 */}
          {tab === 'daily' && periodData && (
            <div className="stats-legend">
              <span className="stats-legend-item stats-legend-high">■ 80%以上</span>
              <span className="stats-legend-item stats-legend-mid">■ 50〜79%</span>
              <span className="stats-legend-item stats-legend-low">■ 50%未満</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
