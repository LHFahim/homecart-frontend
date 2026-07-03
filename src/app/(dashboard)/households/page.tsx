import { HouseholdCreateForm } from "@/components/household-create-form";
import { getHouseholds, type Household } from "@/lib/households-api";
import { Home, ListChecks, UserRound } from "lucide-react";

function formatCreatedBy(household: Household): string {
  const createdBy = household.createdBy;

  if (!createdBy) {
    return "Unknown";
  }

  if (typeof createdBy === "string") {
    return createdBy;
  }

  return createdBy.name ?? createdBy.email ?? createdBy.id;
}

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

  function statusBadge(status: string) {
    const normalized = status.toLowerCase();

    if (normalized === "active") {
      return "border-[#bde0d8] bg-[#edfdf9] text-[#2a6c67]";
    }

    if (normalized === "deleted") {
      return "border-[#efb8c8] bg-[#fff2f7] text-[#953f63]";
    }

    return "border-[#dce7ef] bg-[#f1f8ff] text-[#416d8a]";
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

        <section className="card-lift rounded-4xl border border-[#d8e9ef] bg-[linear-gradient(150deg,#f8fdff,#f3fff9)] p-6 shadow-[0_14px_30px_rgba(126,176,194,0.16)] animate-rise-in animate-delay-2 sm:p-7">
          <h2 className="inline-flex items-center gap-2 font-heading text-2xl font-semibold text-[#2f3550]">
            <ListChecks className="size-5 text-[#4c9ab0]" />
            Existing Households
          </h2>
          <p className="mt-1 text-sm text-[#5f667f]">
            Your households from the backend API.
          </p>

          {householdsError && (
            <p className="mt-4 rounded-2xl border border-[#efb8c8] bg-[#fff2f7] p-3 text-sm text-[#953f63]">
              {householdsError}
            </p>
          )}

          {!householdsError && households.length === 0 && (
            <p className="mt-4 text-sm text-[#5f667f]">
              No households found yet.
            </p>
          )}

          {!householdsError && households.length > 0 && (
            <ul className="mt-4 space-y-3">
              {households.map((household, index) => {
                const status = formatStatus(household);

                return (
                  <li
                    key={household.id || household.name}
                    className="card-lift animate-rise-in rounded-3xl border border-[#ecdcef] bg-[linear-gradient(145deg,#fff,#fff6fb)] p-5 shadow-[0_10px_22px_rgba(183,117,163,0.14)]"
                    style={{ animationDelay: `${90 * index}ms` }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-heading text-2xl text-[#3a304d]">
                        {household.name}
                      </p>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${statusBadge(status)}`}
                      >
                        {status}
                      </span>
                    </div>

                    <p className="mt-3 inline-flex items-center gap-2 text-sm text-[#655977]">
                      <UserRound className="size-4 text-[#57a3a3]" />
                      Created by: {formatCreatedBy(household)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
