'use client'

import { useState } from 'react'

/**
 * The Bid Box Challenge — Agentic AI for Africa Innovation Challenge
 *
 * The complete original source (standalone HTML document with its own
 * Tailwind config, Google Fonts, Material Symbols and interactive scripts)
 * is served byte-for-byte from /public/bidbox.html and rendered here
 * full-viewport so it runs exactly as authored.
 */
export default function Home() {
  const [loaded, setLoaded] = useState(false)

  return (
    <main
      aria-label="The Bid Box Challenge — Agentic AI for Africa Innovation Challenge"
      className="fixed inset-0 overflow-hidden"
      style={{ backgroundColor: '#0f131c' }}
    >
      {/* Loading state shown while the page assets (fonts, Tailwind CDN) finish loading */}
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#68dba9]" />
          <p className="text-sm tracking-wider text-white/50">
            Initializing The Bid Box Challenge…
          </p>
        </div>
      )}

      <iframe
        src="/bidbox.html"
        title="The Bid Box Challenge — Agentic AI for Africa Innovation Challenge"
        className={`h-full w-full border-0 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
    </main>
  )
}
