import { Heart, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const greeting = getGreeting();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_12%,#ffe8f4_0%,transparent_32%),radial-gradient(circle_at_80%_8%,#def7ff_0%,transparent_35%),radial-gradient(circle_at_85%_85%,#e4ffe9_0%,transparent_35%),linear-gradient(165deg,#fff8fd_0%,#fffdf8_48%,#f5fffc_100%)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute -left-20 top-16 h-60 w-60 rounded-full bg-[#ffc9e2]/50 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none absolute right-4 top-24 h-72 w-72 rounded-full bg-[#cdefff]/55 blur-3xl animate-pulse-glow" />

      <section className="relative z-10 mx-auto w-full max-w-6xl space-y-6 text-[#2c2840] animate-rise-in">
        <header className="card-lift rounded-4xl border border-[#efd8ef] bg-[linear-gradient(140deg,rgba(255,255,255,0.92),rgba(255,247,253,0.88))] p-6 shadow-[0_16px_36px_rgba(205,146,179,0.18)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-[#be5f8b]">
                <Sparkles className="size-4" />
                HomeCart
              </p>

              <h1 className="mt-3 font-heading text-4xl tracking-tight text-[#33293f] sm:text-5xl lg:text-6xl">
                Shared Home, Happier Shopping
              </h1>

              <p className="mt-3 inline-flex items-center gap-2 text-base text-[#9a4f73]">
                <Heart className="size-4 text-[#d9709d]" />
                {greeting}
              </p>
            </div>

            <div className="rounded-3xl border border-[#f0d8e8] bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9d88a8]">
                Signed In Account
              </p>
              <p className="mt-2 text-sm font-medium text-[#4a4357] break-all">
                {session.user.email}
              </p>

              <form
                className="mt-4"
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <Button
                  type="submit"
                  className="h-10 w-full rounded-2xl border-0 bg-[linear-gradient(120deg,#ffcfdd,#ffc7a6)] px-5 font-semibold text-[#5c2c47] shadow-[0_8px_18px_rgba(221,132,171,0.27)] hover:brightness-105"
                >
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
