import { NotWired } from '@/components/ui/ui';

export default function Page() {
  return <NotWired title="Promotional Clips" phase="Phase 10"
    ready={['Promo clip picker for 10/15/30/45/60-second clips for TikTok, Reels and Shorts (api/services/promo.py)']}
    missing={['Clip selection and editing screen', 'Rendering clips from the finished video through the render worker']} />;
}
