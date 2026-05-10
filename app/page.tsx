import { Clapperboard, ArrowRight, Play, Link2, MessageSquare, Shield, Globe, Zap } from 'lucide-react'
import HomeClient from './HomeClient'

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context':          'https://schema.org',
          '@type':             'WebApplication',
          name:                'Watch Party',
          description:         'Synchronized video playback for groups. YouTube links or local files, real-time chat. No account required.',
          applicationCategory: 'EntertainmentApplication',
          operatingSystem:     'Web',
          offers:              { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          featureList:         ['YouTube sync', 'Local file P2P streaming', 'Live chat', 'No signup required'],
        })}}
      />

      <div className="flex flex-col min-h-screen bg-[#0c0c0e] text-white">

        {/* ── Nav ───────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 bg-[#0c0c0e]/90 backdrop-blur-md border-b border-white/[0.07]">
          <nav className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
                <Clapperboard size={14} className="text-white" />
              </div>
              <span className="text-[14px] font-bold tracking-tight text-white">Watch Party</span>
            </a>
            <div className="hidden sm:flex items-center gap-8 text-[13px] text-white/40 font-medium">
              <a href="#features"     className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
              <a href="#technology"   className="hover:text-white transition-colors">Technology</a>
            </div>
            <a
              href="#start"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Get started <ArrowRight size={13} />
            </a>
          </nav>
        </header>

        <main className="flex-1">

          {/* ── Hero ─────────────────────────────────────────────────────────── */}
          <section className="border-b border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-32">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[12px] font-semibold px-3 py-1.5 rounded-full mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                  Free · No account · Works in any browser
                </div>
                <h1 className="text-[2.75rem] sm:text-[3.75rem] font-extrabold tracking-tight leading-[1.08] text-white mb-6">
                  Watch videos together,<br className="hidden sm:block" />
                  no matter where you are.
                </h1>
                <p className="text-[17px] sm:text-[18px] text-white/45 leading-relaxed max-w-2xl mb-10">
                  Watch Party lets you stream YouTube videos or your own local files
                  with friends in real time. The host controls playback — viewers stay
                  perfectly in sync. No download, no account, no server uploads.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="#start"
                    className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[.99] text-white text-[15px] font-semibold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-900/40"
                  >
                    <Play size={15} fill="white" />
                    Start a watch party
                  </a>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] text-white/70 text-[15px] font-semibold px-7 py-3.5 rounded-xl transition-colors border border-white/[0.08]"
                  >
                    See how it works
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* ── Stats bar ────────────────────────────────────────────────────── */}
          <section className="bg-white/[0.02] border-b border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
              {[
                { value: '< 5 sec', label: 'Time to create a room'  },
                { value: '2 sec',   label: 'Max sync drift allowed'  },
                { value: '0 bytes', label: 'Uploaded to our servers' },
                { value: '∞',       label: 'Viewers per room'        },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">{s.value}</div>
                  <div className="text-[12px] text-white/30 font-medium mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Features ─────────────────────────────────────────────────────── */}
          <section id="features" className="border-b border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">

              <div className="mb-16">
                <p className="text-[12px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Features</p>
                <h2 className="text-[2rem] sm:text-[2.5rem] font-extrabold tracking-tight text-white mb-4">
                  One link. Everyone watches together.
                </h2>
                <p className="text-[15px] text-white/45 leading-relaxed max-w-2xl">
                  Watch Party handles the hard parts — synchronization, signaling, chat — so
                  all you have to do is share a link and hit play.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-8 lg:gap-12">

                <article className="flex gap-5">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Play size={17} className="text-red-400" fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white mb-2">YouTube link sync</h3>
                    <p className="text-[13px] text-white/40 leading-relaxed">
                      Paste any YouTube URL into the host panel. The video ID is shared with
                      every viewer, and each person loads it directly from YouTube in their own player.
                      This avoids any re-encoding or proxy overhead — quality is native and buffering
                      is per-client. The host&apos;s play, pause, and seek commands are broadcast to
                      all viewers in real time via Socket.IO.
                    </p>
                  </div>
                </article>

                <article className="flex gap-5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Link2 size={17} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white mb-2">Local file peer-to-peer streaming</h3>
                    <p className="text-[13px] text-white/40 leading-relaxed">
                      The host picks any video file from their device — MP4, WebM, or MOV.
                      Watch Party captures a live MediaStream from the video element using the
                      browser&apos;s <code className="font-mono bg-white/[0.06] px-1 py-0.5 rounded text-[12px] text-white/70">captureStream()</code> API,
                      then opens an RTCPeerConnection to each viewer. Video data travels
                      directly between browsers. The file never touches any server.
                    </p>
                  </div>
                </article>

                <article className="flex gap-5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare size={17} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white mb-2">Real-time room chat</h3>
                    <p className="text-[13px] text-white/40 leading-relaxed">
                      A persistent chat panel is available to everyone in the room throughout
                      the session. Messages are delivered instantly over the same Socket.IO
                      connection. The panel stays open or closed independently of the video —
                      closing it never loses messages. An unread badge on the button tracks new
                      messages while the panel is hidden.
                    </p>
                  </div>
                </article>

                <article className="flex gap-5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap size={17} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white mb-2">Host-controlled playback</h3>
                    <p className="text-[13px] text-white/40 leading-relaxed">
                      The host has a full player — play, pause, seek, volume, skip ±10 seconds,
                      and fullscreen. Every control action is broadcast as a timestamped
                      playback state event. Viewers receive the state and apply it immediately.
                      For YouTube mode, a drift correction algorithm keeps viewers within
                      two seconds of the host automatically.
                    </p>
                  </div>
                </article>

                <article className="flex gap-5">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Globe size={17} className="text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white mb-2">No account, no install</h3>
                    <p className="text-[13px] text-white/40 leading-relaxed">
                      Creating a room takes one click. The room ID is generated in the browser
                      and stored only in <code className="font-mono bg-white/[0.06] px-1 py-0.5 rounded text-[12px] text-white/70">sessionStorage</code>.
                      Viewers join by opening the shared link — nothing to install or sign up for.
                      Rooms are ephemeral: when the host disconnects, the room is removed from
                      the server immediately.
                    </p>
                  </div>
                </article>

                <article className="flex gap-5">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield size={17} className="text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white mb-2">Private by design</h3>
                    <p className="text-[13px] text-white/40 leading-relaxed">
                      The server only handles signaling — it relays WebRTC offers, answers,
                      and ICE candidates to establish peer connections, then gets out of the way.
                      Local video data never passes through the server. Room state is held
                      in memory only, never written to disk. Nothing is logged or retained.
                    </p>
                  </div>
                </article>

              </div>
            </div>
          </section>

          {/* ── Technology ───────────────────────────────────────────────────── */}
          <section id="technology" className="bg-white/[0.02] border-b border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
              <div className="mb-12">
                <p className="text-[12px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Under the hood</p>
                <h2 className="text-[2rem] sm:text-[2.5rem] font-extrabold tracking-tight text-white mb-4">
                  Built on open web standards.
                </h2>
                <p className="text-[15px] text-white/45 leading-relaxed max-w-2xl">
                  No proprietary SDKs. No third-party video infrastructure.
                  Watch Party runs entirely on browser-native APIs.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {
                    tech:  'WebRTC',
                    color: 'bg-blue-500/10 border-blue-500/20',
                    tc:    'text-blue-400',
                    desc:  'RTCPeerConnection carries local video streams directly between browsers. Each viewer gets a cloned MediaStreamTrack to prevent black-screen issues across multiple connections.',
                  },
                  {
                    tech:  'Socket.IO',
                    color: 'bg-indigo-500/10 border-indigo-500/20',
                    tc:    'text-indigo-400',
                    desc:  'WebSocket-based signaling layer. Relays WebRTC offers, answers, ICE candidates, playback state, and chat messages. The server never sees video data.',
                  },
                  {
                    tech:  'YouTube IFrame API',
                    color: 'bg-red-500/10 border-red-500/20',
                    tc:    'text-red-400',
                    desc:  'Each participant loads the YouTube player locally. The host emits play/pause/seek events with timestamps. A drift-correction algorithm re-syncs viewers who buffer.',
                  },
                  {
                    tech:  'Next.js 16',
                    color: 'bg-white/[0.04] border-white/[0.08]',
                    tc:    'text-white/60',
                    desc:  'App Router with a custom Node.js server that mounts Socket.IO alongside Next.js request handling on the same port. Server components for static pages, client components for real-time UI.',
                  },
                  {
                    tech:  'captureStream()',
                    color: 'bg-emerald-500/10 border-emerald-500/20',
                    tc:    'text-emerald-400',
                    desc:  "The browser captures a 30 fps live stream from the host's video element. This stream is piped into each viewer's RTCPeerConnection without any server relay.",
                  },
                  {
                    tech:  'Tailwind CSS',
                    color: 'bg-sky-500/10 border-sky-500/20',
                    tc:    'text-sky-400',
                    desc:  'Utility-first CSS. Responsive breakpoints handle mobile layout automatically. The player shell uses absolute positioning to fill the available space in all screen sizes.',
                  },
                ].map(t => (
                  <div key={t.tech} className={`border rounded-xl p-5 ${t.color}`}>
                    <p className={`text-[12px] font-bold uppercase tracking-widest mb-2.5 ${t.tc}`}>{t.tech}</p>
                    <p className="text-[13px] text-white/40 leading-relaxed">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── How it works ─────────────────────────────────────────────────── */}
          <section id="how-it-works" className="border-b border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
              <div className="mb-16">
                <p className="text-[12px] font-bold text-indigo-400 uppercase tracking-widest mb-3">How it works</p>
                <h2 className="text-[2rem] sm:text-[2.5rem] font-extrabold tracking-tight text-white mb-4">
                  From zero to watching in under a minute.
                </h2>
                <p className="text-[15px] text-white/45 leading-relaxed max-w-2xl">
                  Watch Party is designed to have no friction at all. There is nothing
                  to configure and no accounts to manage.
                </p>
              </div>

              <div className="space-y-0 divide-y divide-white/[0.06]">
                {[
                  {
                    n:     '01',
                    title: 'Create a room',
                    desc:  'Click "Create room". A unique 8-character room ID is generated in your browser and stored in sessionStorage so the server recognises you as the host. You are taken directly to the host view where you can see your room link and the viewer count.',
                  },
                  {
                    n:     '02',
                    title: 'Share the link',
                    desc:  'Copy your room link from the header and send it to anyone — via message, email, or just read out the 8-character code. Recipients paste the link or code into the join box on this page. There is nothing to install.',
                  },
                  {
                    n:     '03',
                    title: 'Choose your video source',
                    desc:  'As the host you pick one of two modes. YouTube mode: paste any YouTube URL and the video ID is broadcast to all viewers, each of whom loads it locally. Local file mode: choose a video file from your device — it is streamed peer-to-peer via WebRTC to each viewer.',
                  },
                  {
                    n:     '04',
                    title: 'Press play — everyone syncs',
                    desc:  'Your play command is broadcast with a timestamp. Viewers receive it and start playback. If anyone buffers or drifts more than two seconds, the drift-correction algorithm re-seeks them automatically. You can pause, seek, or skip at any time and all viewers follow instantly.',
                  },
                ].map(s => (
                  <div key={s.n} className="py-8 grid sm:grid-cols-[80px_1fr] gap-4 sm:gap-10 items-start">
                    <div className="text-[11px] font-mono font-semibold text-white/20 tracking-widest pt-0.5">{s.n}</div>
                    <div>
                      <h3 className="text-[16px] font-bold text-white mb-2">{s.title}</h3>
                      <p className="text-[13px] text-white/40 leading-relaxed max-w-2xl">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA ──────────────────────────────────────────────────────────── */}
          <section id="start" className="bg-white/[0.02] border-b border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
              <div className="mb-12">
                <h2 className="text-[2rem] sm:text-[2.5rem] font-extrabold tracking-tight text-white mb-3">
                  Start watching now.
                </h2>
                <p className="text-[15px] text-white/45 leading-relaxed max-w-xl">
                  Create a room as the host, or join an existing room with a code.
                  No account, no credit card, no setup.
                </p>
              </div>
              <HomeClient />
            </div>
          </section>

        </main>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="border-t border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                <Clapperboard size={12} className="text-white" />
              </div>
              <span className="text-[13px] font-bold text-white/80">Watch Party</span>
            </div>
            <p className="text-[12px] text-white/25">
              Video streams peer-to-peer via WebRTC. Nothing is uploaded to or stored on any server.
            </p>
          </div>
        </footer>

      </div>
    </>
  )
}
