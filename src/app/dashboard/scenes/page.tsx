import { NotWired } from '@/components/ui/ui';

export default function Page() {
  return <NotWired title="AI Scene Generator" phase="Phase 6"
    ready={['Provider layer for ComfyUI, Replicate and fal with retries and honest "not configured" errors (api/providers/)', 'Generation endpoints: submit, poll, cancel (api/routes/api.py)']}
    missing={['Generation screen and worker job that downloads finished clips into storage', 'A configured provider and a ComfyUI workflow built only from commercially approved models', 'Live testing against a real provider (only mocked so far)']} />;
}
