// Add or remove cards by editing this array. Each card just needs a name, artist, and href.
const musicLinks: { name: string; artist: string; href: string }[] = [
  {
    name: "All Girls Are The Same",
    artist: "Juice WRLD",
    href: "https://www.youtube.com/watch?v=h3EJICKwITw&list=RDh3EJICKwITw&start_radio=1&pp=ygUhYWxsIGdpcmxzIGFyZSB0aGUgc2FtZSBqdWljZSB3cmxkoAcB",
  },
  {
    name: "Quiet",
    artist: "Juice WRLD",
    href: "https://www.youtube.com/watch?v=A3WkBtwnTlw&list=RDA3WkBtwnTlw&start_radio=1&pp=ygULcXVpZXQganVpY2WgBwHSBwkJBAsBhyohjO8%3D",
  },
  {
    name: "How Long How Low",
    artist: "Hayd, Chance Peña",
    href: "https://youtu.be/8G8hxHexcBI?si=1gqBi06l4cywcGiC",
  },
  {
    name: "All My Fault",
    artist: "Juice WRLD",
    href: "https://www.youtube.com/watch?v=KZxLFe05pco&list=RDKZxLFe05pco&start_radio=1",
  },
];

export default function InstantChatPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060816] text-white">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.25),transparent_40%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.18),transparent_35%)]" />

      {/* Noise / glass atmosphere */}
      <div className="absolute inset-0 backdrop-blur-3xl" />

      <div className="relative flex min-h-screen flex-col items-center justify-center gap-16 p-8">
        <div className="max-w-5xl rounded-[32px] border border-white/10 bg-white/5 px-10 py-20 shadow-[0_0_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <h1 className="text-center text-3xl font-black leading-tight tracking-[-0.04em] text-white sm:text-4xl md:text-4xl">
            This page has been removed for the sake of sanity.
          </h1>

          <p className="mt-10 text-center text-2xl font-medium text-white/60 sm:text-3xl md:text-4xl">
            Why does God hate me?
          </p>
        </div>

        {/* Music link cards */}
        <section className="w-full max-w-5xl">
          <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-[0.4em] text-white/50">
            Listening To
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {musicLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:border-white/25 hover:bg-white/10 hover:shadow-[0_0_60px_rgba(120,119,198,0.35)]"
              >
                {/* gradient sheen */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.25),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.2),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex items-center gap-4">
                  {/* YouTube play badge */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/30 transition-transform duration-500 group-hover:scale-110">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="ml-0.5 h-5 w-5 text-white"
                      aria-hidden="true"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>

                  <div className="flex-1">
                    <p className="whitespace-nowrap text-[10px] uppercase tracking-[0.25em] text-white/40">
                      YouTube
                    </p>
                    <p className="mt-1 whitespace-nowrap text-lg font-semibold leading-tight text-white">
                      {link.name}
                    </p>
                    <p className="mt-0.5 whitespace-nowrap text-sm text-white/60">
                      {link.artist}
                    </p>
                  </div>

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 shrink-0 text-white/40 transition-all duration-500 group-hover:translate-x-1 group-hover:text-white"
                    aria-hidden="true"
                  >
                    <path d="M7 17L17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
