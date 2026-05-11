export default function InstantChatPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060816] text-white">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.25),transparent_40%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.18),transparent_35%)]" />

      {/* Noise / glass atmosphere */}
      <div className="absolute inset-0 backdrop-blur-3xl" />

      <div className="relative flex min-h-screen items-center justify-center p-8">
        <div className="max-w-5xl rounded-[32px] border border-white/10 bg-white/5 px-10 py-20 shadow-[0_0_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <h1 className="text-center text-3xl font-black leading-tight tracking-[-0.04em] text-white sm:text-4xl md:text-4xl">
            This page has been removed for the sake of sanity.
          </h1>

          <p className="mt-10 text-center text-2xl font-medium text-white/60 sm:text-3xl md:text-4xl">
            Why does God hate me?
          </p>
        </div>
      </div>
    </main>
  );
}
