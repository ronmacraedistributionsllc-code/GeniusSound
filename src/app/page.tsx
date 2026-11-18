import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Create Music Videos <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
              with AI
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Upload your audio and let our AI generate stunning music videos with automatic scene matching, lyrics synchronization, and more.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-500/20"
            >
              Start Creating
            </Link>
            <button className="inline-flex items-center justify-center px-8 py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl font-semibold transition-colors">
              View Demo
            </button>
          </div>

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No credit card required • Free tier available
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              AI-Powered Music Video Creation
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Transform your audio into professional-grade music videos with our advanced AI technology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Automatic Scene Detection',
                description: 'Our AI analyzes your song structure to create perfectly timed scenes that match the rhythm and energy.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                ),
              },
              {
                title: 'Smart Lyrics Sync',
                description: 'Automatic lyric detection and synchronization for karaoke-style visual effects.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m-6 0V7a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                ),
              },
              {
                title: 'AI Creative Director',
                description: 'Get creative suggestions for scenes, locations, and visual effects tailored to your music.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Projects Created', value: '10,000+' },
              { label: 'Videos Generated', value: '50,000+' },
              { label: 'Happy Users', value: '2,500+' },
              { label: 'AI Models', value: '15+' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-zinc-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-blue-500 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Create Your First AI Music Video?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of artists and creators using Genius Sound to bring their music to life.
          </p>
          
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold transition-colors shadow-lg"
          >
            Get Started for Free
          </Link>
        </div>
      </section>
    </div>
  );
}
