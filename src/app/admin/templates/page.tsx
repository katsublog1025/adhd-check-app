'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Template {
  id: number;
  title: string;
  category: string;
  sortOrder: number;
  isWeekly: boolean;
  isActive: boolean;
}

// ドラッグ可能なアイテムコンポーネント
function SortableTemplateItem({
  template,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  template: Template;
  onToggleActive: (t: Template) => void;
  onEdit: (t: Template) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: template.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 2 : 1,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`template-item ${!template.isActive ? 'inactive' : ''}`}
    >
      <div
        className="drag-handle"
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          padding: '0 12px 0 4px',
          color: '#aaa',
          display: 'flex',
          alignItems: 'center',
          touchAction: 'none',
        }}
      >
        <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
        </svg>
      </div>
      <div className="template-info">
        <div className="template-title">{template.title}</div>
        <div className="template-meta">
          順序: {template.sortOrder} | {template.isWeekly ? '週次' : '日次'} |{' '}
          {template.isActive ? '有効' : '無効'}
        </div>
      </div>
      <div className="template-actions">
        <button
          className="btn btn-small btn-ghost"
          onClick={() => onToggleActive(template)}
        >
          {template.isActive ? '無効化' : '有効化'}
        </button>
        <button className="btn btn-small btn-outline" onClick={() => onEdit(template)}>
          編集
        </button>
        <button
          className="btn btn-small btn-danger"
          onClick={() => onDelete(template.id)}
        >
          削除
        </button>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '出勤時',
    sortOrder: 99,
    isWeekly: false,
  });
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/templates');
      if (!res.ok) {
        router.push('/');
        return;
      }
      const data = await res.json();
      setTemplates(data.templates);
    } catch {
      console.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeItem = templates.find((t) => t.id === active.id);
    const overItem = templates.find((t) => t.id === over.id);

    // 同じカテゴリ内での並び替えのみ許可
    if (!activeItem || !overItem || activeItem.category !== overItem.category) {
      return;
    }

    const category = activeItem.category;
    // 対象カテゴリのテンプレートをソート順で取得
    const catTemplates = templates
      .filter((t) => t.category === category)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const oldIndex = catTemplates.findIndex((t) => t.id === active.id);
    const newIndex = catTemplates.findIndex((t) => t.id === over.id);

    // 配列の要素を移動
    const reordered = arrayMove(catTemplates, oldIndex, newIndex);

    // 元のソート順序の数値を抽出し、新しい並びにその数値を割り当てる
    const originalOrders = catTemplates
      .map((t) => t.sortOrder)
      .sort((a, b) => a - b);
    const updatedCategoryTemplates = reordered.map((t, index) => ({
      ...t,
      sortOrder: originalOrders[index],
    }));

    // Optimistic UI Update（画面表示を先に更新）
    setTemplates((prev) => {
      const newTemplates = [...prev];
      updatedCategoryTemplates.forEach((ut) => {
        const idx = newTemplates.findIndex((pt) => pt.id === ut.id);
        if (idx !== -1) newTemplates[idx] = ut;
      });
      return newTemplates;
    });

    // バックエンドへ一括更新リクエスト送信
    const payload = updatedCategoryTemplates.map((t) => ({
      id: t.id,
      sortOrder: t.sortOrder,
    }));
    try {
      const res = await fetch('/api/admin/templates/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: payload }),
      });
      if (!res.ok) throw new Error('Failed');
    } catch (e) {
      console.error('Failed to save order', e);
      fetchTemplates(); // 失敗時は元の状態に戻す
    }
  };

  const handleSubmit = async () => {
    const method = editingId ? 'PUT' : 'POST';
    const body = editingId ? { id: editingId, ...formData } : formData;

    const res = await fetch('/api/admin/templates', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      setFormData({ title: '', category: '出勤時', sortOrder: 99, isWeekly: false });
      fetchTemplates();
    }
  };

  const handleEdit = (t: Template) => {
    setEditingId(t.id);
    setFormData({
      title: t.title,
      category: t.category,
      sortOrder: t.sortOrder,
      isWeekly: t.isWeekly,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このテンプレートを削除しますか？')) return;

    await fetch('/api/admin/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    fetchTemplates();
  };

  const handleToggleActive = async (t: Template) => {
    await fetch('/api/admin/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, isActive: !t.isActive }),
    });

    fetchTemplates();
  };

  const categories = ['出勤時', '業務中', '閉店前・退勤前', '週次確認'];

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="header">
        <div className="header-title">テンプレート管理</div>
      </div>

      <div className="admin-nav">
        <Link href="/admin" className="admin-nav-item">ダッシュボード</Link>
        <Link href="/admin/users" className="admin-nav-item">利用者管理</Link>
        <span className="admin-nav-item active">テンプレート管理</span>
        <Link href="/admin/notifications" className="admin-nav-item">通知履歴</Link>
        <Link href="/admin/test-mode" className="admin-nav-item">テストモード</Link>
      </div>

      <button
        className="btn btn-primary mb-16"
        onClick={() => {
          setShowForm(true);
          setEditingId(null);
          // 新規追加時、現在の最大ソート順+1を自動セット
          const maxSortOrder = templates.length > 0 
            ? Math.max(...templates.map(t => t.sortOrder)) 
            : 0;
          setFormData({ title: '', category: '出勤時', sortOrder: maxSortOrder + 1, isWeekly: false });
        }}
      >
        + 新規追加
      </button>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card mb-16">
          <h3 className="card-title">{editingId ? '編集' : '新規追加'}</h3>
          <div className="form-group">
            <label className="form-label">タイトル</label>
            <input
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="チェック項目のタイトル"
            />
          </div>
          <div className="form-group">
            <label className="form-label">区分</label>
            <select
              className="form-select"
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value,
                  isWeekly: e.target.value === '週次確認',
                })
              }
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">表示順</label>
            <input
              className="form-input"
              type="number"
              value={formData.sortOrder}
              onChange={(e) =>
                setFormData({ ...formData, sortOrder: parseInt(e.target.value) })
              }
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingId ? '更新' : '追加'}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Template List with Drag and Drop Context */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {categories.map((cat) => {
          const catTemplates = templates
            .filter((t) => t.category === cat)
            .sort((a, b) => a.sortOrder - b.sortOrder);
            
          if (catTemplates.length === 0) return null;
          return (
            <div key={cat} style={{ marginBottom: '20px' }}>
              <h3
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  marginBottom: '8px',
                  color: 'var(--color-primary)',
                }}
              >
                {cat}
              </h3>
              <SortableContext
                items={catTemplates.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {catTemplates.map((t) => (
                  <SortableTemplateItem
                    key={t.id}
                    template={t}
                    onToggleActive={handleToggleActive}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </div>
          );
        })}
      </DndContext>
    </div>
  );
}
