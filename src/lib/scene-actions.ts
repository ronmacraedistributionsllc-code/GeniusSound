import { z } from 'zod';

export const SceneAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('edit'), description: z.string().min(1).max(4000).optional(), title: z.string().min(1).max(120).optional(), location: z.string().max(300).optional(),
    cameraAngle: z.string().max(200).optional(), cameraMove: z.string().max(200).optional(), lighting: z.string().max(200).optional(), transition: z.string().max(100).optional(), lyricText: z.string().max(2000).optional() }),
  z.object({ action: z.literal('approve') }), z.object({ action: z.literal('reject') }),
  z.object({ action: z.literal('lock') }), z.object({ action: z.literal('unlock') }),
  z.object({ action: z.literal('move'), direction: z.enum(['up', 'down']) }),
]);
export type SceneActionInput = z.infer<typeof SceneAction>;

/** Rules (mirrors api/services/storyboard.py): locked scenes can't be edited/rejected/moved/deleted; approving needs content. */
export function guard(scene: { locked: boolean; status: string }, action: SceneActionInput['action'] | 'delete'): string | null {
  if (scene.locked && ['edit', 'reject', 'move', 'delete', 'approve'].includes(action)) return 'Scene is locked; unlock it first';
  if (action === 'unlock' && !scene.locked) return 'Scene is not locked';
  return null;
}
