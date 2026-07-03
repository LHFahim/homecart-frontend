"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  createHouseholdAction,
  type CreateHouseholdFormState,
} from "@/app/households/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function HouseholdCreateForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    CreateHouseholdFormState,
    FormData
  >(createHouseholdAction, undefined);

  useEffect(() => {
    if (state?.createdAt) {
      router.refresh();
    }
  }, [router, state?.createdAt]);

  return (
    <form
      action={formAction}
      className="card-lift rounded-4xl border border-[#ecd8ef] bg-[linear-gradient(145deg,#fff8fe,#fff6fb)] p-6 shadow-[0_14px_30px_rgba(202,137,180,0.16)] animate-rise-in animate-delay-1 sm:p-7"
    >
      <h2 className="inline-flex items-center gap-2 font-heading text-3xl text-[#3c3050]">
        <Sparkles className="size-5 text-[#cf6d9f]" />
        Create Household
      </h2>
      <p className="mt-1 text-sm text-[#6c5b7a]">
        Give your home a cozy name and start planning together.
      </p>

      <div className="mt-5 space-y-2">
        <Label htmlFor="name" className="text-[#4b4161]">
          Household Name
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. HomeCart Family"
          required
          className="h-12 rounded-3xl border-[#e8cfe5] bg-white px-4 text-[#3d3550] placeholder:text-[#9f90ad] focus-visible:border-[#d98bb9] focus-visible:ring-[#d98bb9]/30"
        />
        {state?.fieldErrors?.name?.[0] && (
          <p className="text-sm text-[#a04472]">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      {state?.error && (
        <p className="mt-4 rounded-2xl border border-[#efb8c8] bg-[#fff2f7] px-3 py-2 text-sm text-[#953f63]">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="mt-4 rounded-2xl border border-[#bde0d8] bg-[#edfdf9] px-3 py-2 text-sm text-[#2a6c67]">
          {state.success}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="mt-5 h-12 rounded-3xl border-0 bg-[linear-gradient(120deg,#ffd1e2,#ffc6b8)] px-6 font-semibold text-[#5f2f4f] shadow-[0_10px_22px_rgba(214,130,173,0.24)] hover:brightness-105"
      >
        {pending ? "Creating..." : "Create Household"}
      </Button>
    </form>
  );
}
