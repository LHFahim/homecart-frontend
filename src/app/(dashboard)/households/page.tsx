import { HouseholdCartsPanel } from "@/components/household-carts-panel";
import { HouseholdCreateForm } from "@/components/household-create-form";
import { getCarts, type Cart } from "@/lib/carts-api";
import { getHouseholds, type Household } from "@/lib/households-api";
import { Home } from "lucide-react";

function formatStatus(household: Household): string {
  if (household.deletedAt) {
    return "Deleted";
  }

  if (typeof household.isActive === "boolean") {
    return household.isActive ? "Active" : "Inactive";
  }

  if (household.status) {
    return household.status;
  }

  return "Active";
}

export default async function HouseholdsPage() {
  let households: Household[] = [];
  let householdsError: string | null = null;
  let initialCarts: Cart[] = [];
  let initialCartsError: string | null = null;

  try {
    const response = await getHouseholds();
    households = response.data;
  } catch (error: unknown) {
    householdsError =
      error instanceof Error
        ? error.message
        : "Unable to load households right now.";
  }

  const totalHouseholds = households.length;
  const activeHouseholds = households.filter(
    (household) => formatStatus(household).toLowerCase() === "active",
  ).length;
  const archivedHouseholds = totalHouseholds - activeHouseholds;
  const initialSelectedHouseholdId = households[0]?.id ?? "";

  if (!householdsError && initialSelectedHouseholdId) {
    try {
      const response = await getCarts({
        householdId: initialSelectedHouseholdId,
      });
      initialCarts = response.data;
    } catch (error: unknown) {
      initialCartsError =
        error instanceof Error
          ? error.message
          : "Unable to load carts for this household.";
    }
  }

  return (
    <>
      <section className="card-lift rounded-4xl border border-[#ecd8ef] bg-[linear-gradient(150deg,#fff8fe,#fff5fa)] p-6 shadow-[0_14px_30px_rgba(202,137,180,0.16)] animate-rise-in sm:p-7">
        <h1 className="inline-flex items-center gap-3 font-heading text-3xl tracking-tight text-[#3c3050] sm:text-4xl">
          <Home className="size-7 text-[#cf6d9f]" />
          Households
        </h1>
        <p className="mt-2 text-base text-[#6c5b7a]">
          Create one place for your weekly planning and household spending.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#f0dce8] bg-white/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a48baf]">
              Total
            </p>
            <p className="mt-1 text-2xl font-heading text-[#3c3050]">
              {totalHouseholds}
            </p>
          </div>
          <div className="rounded-2xl border border-[#cde9df] bg-[#f2fcf7] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4b8a79]">
              Active
            </p>
            <p className="mt-1 text-2xl font-heading text-[#2f5f54]">
              {activeHouseholds}
            </p>
          </div>
          <div className="rounded-2xl border border-[#f0dce8] bg-[#fff6fb] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9f6a82]">
              Other
            </p>
            <p className="mt-1 text-2xl font-heading text-[#6a4758]">
              {archivedHouseholds}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <HouseholdCreateForm />
        </div>

        <HouseholdCartsPanel
          households={households}
          householdsError={householdsError}
          initialSelectedHouseholdId={initialSelectedHouseholdId}
          initialCarts={initialCarts}
          initialCartsError={initialCartsError}
        />
      </div>
    </>
  );
}
