"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  authenticate,
  type LoginFormState,
} from "@/app/(commonLayout)/login/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    authenticate,
    undefined
  );

  return (
    <Card className="overflow-hidden rounded-3xl border-white/15 bg-slate-900/70 py-0 text-slate-100 shadow-[0_20px_80px_rgba(2,132,199,0.25)] backdrop-blur-sm">
      <CardHeader className="gap-3 px-8 pt-8 pb-0">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">
          HomeCart
        </p>
        <CardTitle className="text-3xl font-bold text-white tracking-tight">
          Welcome back
        </CardTitle>
        <CardDescription className="text-base text-slate-300">
          Sign in to continue managing your cart, orders, and saved addresses.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 px-8 py-6">
        <form className="space-y-4" action={formAction}>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-base text-slate-100">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="h-12 rounded-xl border-slate-700 bg-slate-950 px-4 text-base text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/35"
            />
            {state?.errors?.email && (
              <p className="text-sm text-red-300">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-base text-slate-100">
                Password
              </Label>
              <Link
                href="#"
                className="text-xs font-medium text-cyan-300 transition hover:text-cyan-200"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              className="h-12 rounded-xl border-slate-700 bg-slate-950 px-4 text-base text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/35"
            />
            {state?.errors?.password && (
              <p className="text-sm text-red-300">{state.errors.password[0]}</p>
            )}
          </div>

          {state?.message && (
            <p className="text-sm font-medium text-red-300">{state.message}</p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="mt-2 h-12 w-full rounded-xl bg-cyan-400 text-base font-semibold text-slate-950 hover:bg-cyan-300"
          >
            {pending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-white/10 bg-transparent px-8 py-6">
        <p className="text-center text-base text-slate-300">
          New to HomeCart?{" "}
          <Link
            href="#"
            className="font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            Create account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}