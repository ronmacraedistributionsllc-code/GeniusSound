import { NotWired } from '@/components/ui/ui';

export default function Page() {
  return <NotWired title="Lyric Video Creator" phase="Phase 8"
    ready={['Lyric parsing, word timing and karaoke subtitles with three templates (api/services/lyrics.py, karaoke.py)', 'Lyric video rendering with FFmpeg (api/services/assembly.py)']}
    missing={['Lyrics editor and style picker screen', 'Saving lyrics and word timestamps to the database', 'Installing faster-whisper for automatic transcription (manual lyrics work without it, with estimated timing)']} />;
}
