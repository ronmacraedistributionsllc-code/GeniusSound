'use client';

import { useState } from 'react';
import { 
  Music, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Waveform,
  Info,
  Edit3,
  Download
} from 'lucide-react';

const songAnalysis = {
  title: 'Summer Vibes',
  artist: 'The Melodies',
  bpm: 128,
  key: 'Am',
  duration: '3:45',
  energyLevel: 'High',
  mood: 'Upbeat, energetic',
  sections: [
    { id: '1', label: 'Intro', start: '0:00', end: '0:30' },
    { id: '2', label: 'Verse 1', start: '0:30', end: '1:45' },
    { id: '3', label: 'Chorus', start: '1:45', end: '2:30' },
    { id: '4', label: 'Verse 2', start: '2:30', end: '3:15' },
    { id: '5', label: 'Outro', start: '3:15', end: '3:45' },
  ],
  audioUrl: '/audio/summer-vibes.mp3'
};

export default function SongAnalysisPage() {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  const handleSkip = (seconds: number) => {
    setCurrentTime(prev => Math.max(0, prev + seconds));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
          {songAnalysis.title}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">Analysis and Scene Breakdown</p>
      </div>

      {/* Audio Controls */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={handleSkip}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button 
            onClick={handlePlayPause}
            className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          
          <button 
            onClick={() => handleSkip(10)}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Waveform */}
        <div className="h-32 bg-zinc-50 dark:bg-zinc-800 rounded-lg flex items-center justify-between px-2 mb-4 relative">
          {/* Simulated waveform */}
          <div className="absolute inset-0 w-full h-full opacity-50">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i} 
                className="bg-blue-500 rounded-full absolute"
                style={{
                  left: `${(i / 20) * 100}%`,
                  height: `${30 + Math.random() * 60}px`,
                  width: '4px',
                }}
              />
            ))}
          </div>
          
          {/* Current position marker */}
          <div 
            className="absolute h-full border-l-2 border-red-500 pointer-events-none transition-all duration-100"
            style={{ left: `${(currentTime / 225) * 100}%` }}
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full" />
          </div>
        </div>

        {/* Seek Bar */}
        <input
          type="range"
          min="0"
          max={225}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />

        <div className="flex justify-between mt-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>3:45</span>
        </div>
      </div>

      {/* Song Analysis Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'BPM', value: songAnalysis.bpm, desc: 'Beats per minute' },
          { label: 'Key', value: songAnalysis.key, desc: 'Musical key' },
          { label: 'Duration', value: songAnalysis.duration, desc: 'Total length' },
          { label: 'Energy', value: songAnalysis.energyLevel, desc: 'Overall intensity' },
          { label: 'Mood', value: songAnalysis.mood, desc: 'Emotional tone' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">{stat.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</span>
              <Info className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Song Sections */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Song Sections</h2>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {songAnalysis.sections.map((section) => (
            <div 
              key={section.id}
              className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium">
                  {section.id}
                </div>
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-white">{section.label}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {section.start} - {section.end}
                  </p>
                </div>
              </div>

              <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
                <Edit3 className="w-4 h-4" />
                Edit Scene
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Total: {songAnalysis.sections.length} sections
            </p>
            
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scene Generation */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500 rounded-lg text-white">
            <Waveform className="w-6 h-6" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
              AI Scene Generator
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Automatically generate scenes for each song section using our AI creative director
            </p>
            
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
              <Play className="w-4 h-4" />
              Generate Scenes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
