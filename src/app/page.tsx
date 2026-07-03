import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900 p-8 text-white shadow-[0_20px_80px_rgba(2,132,199,0.2)]">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">
          HomeCart
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          You are signed in
        </h1>
        <p className="mt-3 text-slate-300">
          Logged in as <span className="font-medium">{session.user.email}</span>
        </p>

        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button
            type="submit"
            className="h-11 w-auto rounded-xl bg-cyan-400 px-5 text-slate-950 hover:bg-cyan-300"
          >
            Sign Out
          </Button>
        </form>
      </section>
    </main>
  );
}
