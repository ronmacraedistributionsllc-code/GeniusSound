import { FileVideo, Music, BarChart3, Users } from 'lucide-react';
import Link from 'next/link';

const stats = [
  { label: 'Projects', value: '12', icon: FileVideo, color: 'text-blue-500' },
  { label: 'Audio Files', value: '24', icon: Music, color: 'text-purple-500' },
  { label: 'Videos Generated', value: '48', icon: BarChart3, color: 'text-green-500' },
  { label: 'Total Usage', value: '$124.50', icon: Users, color: 'text-orange-500' },
];

const recentProjects = [
  { id: '1', title: 'Summer Vibes', status: 'Generating', progress: 65, updatedAt: '2 hours ago' },
  { id: '2', title: 'Night Drive', status: 'Completed', progress: 100, updatedAt: '1 day ago' },
  { id: '3', title: 'Acoustic Session', status: 'Editing', progress: 80, updatedAt: '2 days ago' },
  { id: '4', title: 'Demo Track', status: 'Draft', progress: 25, updatedAt: '3 days ago' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Welcome back! Here's what's happening with your projects.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{stat.label}</p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Recent Projects</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Your latest music video projects</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Project</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Progress</th>
                    <th className="px-6 py-3 font-medium">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {recentProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">
                        <Link href={`/dashboard/projects/${project.id}`} className="hover:text-blue-500 transition-colors">
                          {project.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          project.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          project.status === 'Generating' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          project.status === 'Editing' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                          'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                        {project.updatedAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
              <Link href="/dashboard/projects" className="text-sm font-medium text-blue-500 hover:text-blue-600 dark:hover:text-blue-400">
                View all projects &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Quick Actions</h2>
          
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Create New Project</h3>
            <p className="text-blue-100 mb-6 text-sm">Start a new music video project with your uploaded audio</p>
            <Link href="/dashboard/upload" className="inline-flex items-center justify-center px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors">
              Upload Audio
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Link href="/dashboard/projects" className="group block bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-zinc-900 dark:text-white">View Projects</h3>
                <FileVideo className="w-5 h-5 text-zinc-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage all your video projects</p>
            </Link>

            <Link href="/dashboard/analytics" className="group block bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 hover:border-green-500 dark:hover:border-green-500 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-zinc-900 dark:text-white">Analytics</h3>
                <BarChart3 className="w-5 h-5 text-zinc-400 group-hover:text-green-500 transition-colors" />
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Track your usage and costs</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
