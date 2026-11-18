'use client';

import { useState } from 'react';
import { FileVideo, Search, Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

const projects = [
  { id: '1', title: 'Summer Vibes', artist: 'The Melodies', status: 'Generating', progress: 65, date: '2024-01-15', duration: '3:45' },
  { id: '2', title: 'Night Drive', artist: 'Electronic Dreams', status: 'Completed', progress: 100, date: '2024-01-14', duration: '4:20' },
  { id: '3', title: 'Acoustic Session', artist: 'Sarah Jenkins', status: 'Editing', progress: 80, date: '2024-01-13', duration: '3:55' },
  { id: '4', title: 'Demo Track', artist: 'Indie Band', status: 'Draft', progress: 25, date: '2024-01-12', duration: '3:30' },
  { id: '5', title: 'Rock Anthem', artist: 'The Titans', status: 'Completed', progress: 100, date: '2024-01-10', duration: '5:10' },
  { id: '6', title: 'Jazz Fusion', artist: 'Smooth Quartet', status: 'Reviewing', progress: 90, date: '2024-01-08', duration: '4:05' },
];

const statusColors = {
  Draft: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400',
  Analyzing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Conceiving: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Storyboarding: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  Generating: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Assembling: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Completing: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Archived: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400',
};

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Projects</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Manage your music video projects</p>
        </div>
        
        <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
          <Plus className="w-5 h-5" />
          Create Project
        </button>
      </header>

      {/* Search Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-white"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Link 
            key={project.id} 
            href={`/dashboard/projects/${project.id}`}
            className="group bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                <FileVideo className="w-6 h-6" />
              </div>
              <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1 group-hover:text-blue-500 transition-colors">
              {project.title}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">{project.artist}</p>

            <div className="flex items-center gap-2 text-xs mb-4">
              <span className={`px-2 py-1 rounded-full font-medium ${statusColors[project.status as keyof typeof statusColors] || statusColors.Draft}`}>
                {project.status}
              </span>
              <span className="text-zinc-400">•</span>
              <span>{project.date}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Progress</span>
                <span className="font-medium text-zinc-900 dark:text-white">{project.progress}%</span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    project.progress === 100 ? 'bg-green-500' : 
                    project.progress > 50 ? 'bg-blue-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Duration</span>
              <span className="font-medium text-zinc-900 dark:text-white">{project.duration}</span>
            </div>
          </Link>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FileVideo className="w-16 h-16 mx-auto text-zinc-400 mb-4" />
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">No projects found</h3>
          <p className="text-zinc-500 dark:text-zinc-400">Try adjusting your search or create a new project</p>
        </div>
      )}
    </div>
  );
}
