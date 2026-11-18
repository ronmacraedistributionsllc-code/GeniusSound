import { NotWired } from '@/components/ui/ui';

export default function Page() {
  return <NotWired title="Storyboards" phase="Phase 5"
    ready={['Storyboard rules engine: version history, lock, approve/reject, reorder, timeline checks (api/services/storyboard.py)', 'AI creative director that writes concepts and a scene list from your song (api/services/creative_director.py)', 'Database tables for storyboards, scenes and scene versions']}
    missing={['Storyboard editor screen', 'Saving scenes to the database through the rules engine', 'Connecting the creative director to a language model (set LLM_BASE_URL / LLM_MODEL)']} />;
}
