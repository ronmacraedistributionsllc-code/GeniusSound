'use client';

import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { btn, StatusBadge } from '@/components/ui/ui';
import { fmtTime } from '@/lib/client';

type Scene = { id: string; order: number; number: number; title: string; description: string; sectionLabel: string | null; lyricText: string | null; startSec: number; durationSec: number; location: string | null; cameraAngle: string | null; cameraMove: string | null; lighting: string | null; transition: string | null; status: string; locked: boolean };

function SortableSceneItem({ scene, editing, draft, onEdit, onSave, onCancel, onAction, busy, input }: {
  scene: Scene;
  editing: boolean;
  draft: Partial<Scene>;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onAction: (action: string) => void;
  busy: boolean;
  input: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`rounded-lg border p-4 space-y-2 ${isDragging ? 'border-violet-500 bg-violet-950/40' : 'border-zinc-800'}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="font-medium">{scene.number}. {scene.title} <span className="text-zinc-500 text-xs">{fmtTime(scene.startSec)} · {scene.durationSec.toFixed(1)}s</span></span>
        </div>
        <span className="flex items-center gap-2"><StatusBadge status={scene.status === 'DRAFT' ? 'PENDING' : scene.status} />{scene.locked && <span className="text-xs text-amber-300">locked</span>}</span>
      </div>
      {editing ? (
        <div className="space-y-2">
          {(['description', 'location', 'cameraAngle', 'cameraMove', 'lighting'] as const).map((f) => (
            f === 'description'
              ? <textarea key={f} aria-label={f} className={`w-full border border-zinc-700 rounded bg-zinc-900 px-3 py-2 text-sm text-zinc-100 h-24`} value={draft[f] ?? ''} onChange={(e) => onEdit()} />
              : <input key={f} aria-label={f} className={`w-full border border-zinc-700 rounded bg-zinc-900 px-3 py-2 text-sm text-zinc-100`} placeholder={f} value={(draft[f] as string) ?? ''} onChange={(e) => onEdit()} />))}
          <div className="flex gap-2"><button className={btn.primary} disabled={busy} onClick={onSave}>Save</button><button className={btn.ghost} onClick={onCancel}>Cancel</button></div>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-300 whitespace-pre-line">{scene.description}</p>
          <p className="text-xs text-zinc-500">{[scene.location, scene.cameraAngle, scene.cameraMove, scene.lighting].filter(Boolean).join(' · ')}</p>
          {scene.lyricText && <p className="text-xs italic text-zinc-400">"{scene.lyricText}"</p>}
        </>)}
      <div className="flex flex-wrap gap-2 pt-1">
        <button className={btn.ghost} disabled={busy || scene.locked} onClick={() => onAction('edit')}>Edit</button>
        <button className={btn.ghost} disabled={busy || scene.locked || scene.status === 'APPROVED'} onClick={() => onAction('approve')}>Approve</button>
        <button className={btn.ghost} disabled={busy || scene.locked} onClick={() => onAction('reject')}>Reject</button>
        <button className={btn.ghost} disabled={busy} onClick={() => onAction(scene.locked ? 'unlock' : 'lock')}>{scene.locked ? 'Unlock' : 'Lock'}</button>
        <button className={btn.danger} disabled={busy || scene.locked} onClick={() => { if (confirm('Delete this scene?')) onAction('delete'); }}>Delete</button>
      </div>
    </div>
  );
}

export function DraggableScenesList({ scenes, onReorder, onSceneAction, editing, draft, onEdit, onSave, onCancel, busy }: {
  scenes: Scene[];
  onReorder: (scenes: Scene[]) => void;
  onSceneAction: (sceneId: string, action: string) => void;
  editing: string | null;
  draft: Partial<Scene>;
  onEdit: () => void;
  onSave: (sceneId: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = scenes.findIndex((s) => s.id === active.id);
    const newIndex = scenes.findIndex((s) => s.id === over.id);
    const newOrder = arrayMove(scenes, oldIndex, newIndex);
    onReorder(newOrder);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {scenes.map((scene) => (
            <SortableSceneItem
              key={scene.id}
              scene={scene}
              editing={editing === scene.id}
              draft={draft}
              onEdit={onEdit}
              onSave={() => onSave(scene.id)}
              onCancel={onCancel}
              onAction={(action) => onSceneAction(scene.id, action)}
              busy={busy}
              input=""
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
