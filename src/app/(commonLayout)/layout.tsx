export default function CommonLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.25),transparent_42%),radial-gradient(circle_at_85%_80%,rgba(45,212,191,0.22),transparent_45%),linear-gradient(160deg,#020617,#0f172a_40%,#111827)]" />
      <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-16 bottom-16 h-72 w-72 rounded-full border border-cyan-300/20" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}