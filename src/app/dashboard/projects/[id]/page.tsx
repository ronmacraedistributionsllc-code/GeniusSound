'use client';

import { useState } from 'react';
import { 
  FileVideo, 
  Music, 
  Play, 
  Edit3, 
  Trash2, 
  MoreVertical, 
  CheckCircle,
  Clock,
  Download,
  Plus
} from 'lucide-react';
import Link from 'next/link';

const project = {
  id: '1',
  title: 'Summer Vibes',
  description: 'A feel-good summer anthem with upbeat electronic production.',
  status: 'Generating',
  audioFile: {
    name: 'summer-vibes.mp3',
    size: '2.4 MB',
    duration: '3:45'
  },
  createdAt: 'January 15, 2024',
  updatedAt: '2 hours ago'
};

const songAnalysis = {
  bpm: 128,
  key: 'Am',
  duration: '3:45',
  energyLevel: 'High',
  mood: 'Upbeat, energetic'
};

const scenes = [
  { id: '1', title: 'Intro Scene', description: 'Sunrise over the ocean with the artist performing on the beach.', status: 'Approved', progress: 100, duration: '0:30' },
  { id: '2', title: 'Verse 1', description: 'Artist walking through a palm tree-lined street.', status: 'Generating', progress: 45, duration: '0:45' },
  { id: '3', title: 'Chorus', description: 'Dancers joining the artist in a vibrant street performance.', status: 'Pending', progress: 0, duration: '0:50' },
  { id: '4', title: 'Verse 2', description: 'Close-up shots of the artist with the ocean in the background.', status: 'Pending', progress: 0, duration: '0:45' },
];

export default function ProjectDetailPage() {
  const [activeTab, setActiveTab] = useState('scenes');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
            {project.title}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">{project.description}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            <MoreVertical className="w-4 h-4" />
            Actions
          </button>
          <Link 
            href="/dashboard/projects"
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg font-medium text-sm transition-colors"
          >
            Back to Projects
          </Link>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          project.status === 'Completed' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : project.status === 'Generating' 
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        }`}>
          {project.status}
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Updated {project.updatedAt}
        </span>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Audio File', value: project.audioFile.name, icon: Music },
          { label: 'Duration', value: project.audioFile.duration, icon: Clock },
          { label: 'Created', value: project.createdAt, icon: FileVideo },
          { label: 'Last Updated', value: project.updatedAt, icon: Clock },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{stat.label}</p>
            <div className="flex items-center gap-2 mt-1">
              <stat.icon className="w-4 h-4 text-zinc-500" />
              <p className="font-medium text-zinc-900 dark:text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Song Analysis */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          Song Analysis
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'BPM', value: songAnalysis.bpm },
            { label: 'Key', value: songAnalysis.key },
            { label: 'Duration', value: songAnalysis.duration },
            { label: 'Energy Level', value: songAnalysis.energyLevel },
            { label: 'Mood', value: songAnalysis.mood },
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.label}</span>
              <span className="font-medium text-zinc-900 dark:text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {['scenes', 'storyboard', 'analytics'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-zinc-900 dark:text-white'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Scenes Tab */}
      {activeTab === 'scenes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
              Scenes ({scenes.length})
            </h2>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors">
              <Plus className="w-4 h-4" />
              Add Scene
            </button>
          </div>

          {scenes.map((scene) => (
            <div 
              key={scene.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {scene.title}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      scene.status === 'Approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : scene.status === 'Generating'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400'
                    }`}>
                      {scene.status}
                    </span>
                  </div>
                  
                  <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                    {scene.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500 dark:text-zinc-400">Generation Progress</span>
                      <span className="font-medium text-zinc-900 dark:text-white">{scene.progress}%</span>
                    </div>
                    
                    {scene.status !== 'Approved' && (
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            scene.status === 'Generating' ? 'bg-blue-500 animate-pulse' : 
                            scene.status === 'Approved' ? 'bg-green-500' : 'bg-zinc-400'
                          }`}
                          style={{ width: `${scene.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      Duration: {scene.duration}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {scene.status === 'Approved' && (
                        <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approved
                        </button>
                      )}
                      
                      <Link 
                        href={`/dashboard/scenes/${scene.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Other tabs would go here */}
      {activeTab !== 'scenes' && (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <FileVideo className="w-16 h-16 mx-auto text-zinc-400 mb-4" />
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400">
            This section is under construction
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4">
        {project.status === 'Completed' && (
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
            <Download className="w-5 h-5" />
            Download Video
          </button>
        )}
        
        {project.status !== 'Completed' && (
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
            <Play className="w-5 h-5" />
            Generate Video
          </button>
        )}

        <button className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg font-medium transition-colors">
          <Trash2 className="w-5 h-5" />
          Delete Project
        </button>
      </div>
    </div>
  );
}
