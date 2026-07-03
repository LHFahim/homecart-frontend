"use client";

import { ListChecks, ShoppingBasket, UserRound } from "lucide-react";
import { useState } from "react";

import {
  createCartAction,
  deleteCartAction,
  getHouseholdCartsAction,
  updateCartAction,
} from "@/app/households/cart-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Cart } from "@/lib/carts-api";
import type { Household } from "@/lib/households-api";

function formatHouseholdStatus(household: Household): string {
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

function formatHouseholdCreatedBy(household: Household): string {
  const createdBy = household.createdBy;

  if (!createdBy) {
    return "Unknown";
  }

  if (typeof createdBy === "string") {
    return createdBy;
  }

  return createdBy.name ?? createdBy.email ?? createdBy.id;
}

function formatCartStatus(cart: Cart): string {
  return cart.status ?? "ACTIVE";
}

function cartStatusBadge(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized === "completed") {
    return "border-[#cde9df] bg-[#f2fcf7] text-[#2f5f54]";
  }

  if (normalized === "cancelled") {
    return "border-[#efb8c8] bg-[#fff2f7] text-[#953f63]";
  }

  return "border-[#dce7ef] bg-[#f1f8ff] text-[#416d8a]";
}

interface HouseholdCartsPanelProps {
  households: Household[];
  householdsError: string | null;
  initialSelectedHouseholdId: string;
  initialCarts: Cart[];
  initialCartsError: string | null;
}

export function HouseholdCartsPanel({
  households,
  householdsError,
  initialSelectedHouseholdId,
  initialCarts,
  initialCartsError,
}: HouseholdCartsPanelProps) {
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>(
    initialSelectedHouseholdId,
  );
  const [carts, setCarts] = useState<Cart[]>(initialCarts);
  const [cartsLoading, setCartsLoading] = useState(false);
  const [cartsError, setCartsError] = useState<string | null>(
    initialCartsError,
  );

  const [name, setName] = useState("");
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [editingCartId, setEditingCartId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [updatePendingCartId, setUpdatePendingCartId] = useState<string | null>(
    null,
  );
  const [deletePendingCartId, setDeletePendingCartId] = useState<string | null>(
    null,
  );

  const selectedHousehold =
    households.find((household) => household.id === selectedHouseholdId) ??
    null;

  async function loadCarts(householdId: string) {
    if (!householdId) {
      setCarts([]);
      setCartsError(null);
      return;
    }

    setCartsLoading(true);
    setCartsError(null);

    const result = await getHouseholdCartsAction(householdId);

    if (result.error) {
      setCarts([]);
      setCartsError(result.error);
      setCartsLoading(false);
      return;
    }

    setCarts(result.carts ?? []);
    setCartsLoading(false);
  }

  async function handleSelectHousehold(householdId: string) {
    setSelectedHouseholdId(householdId);
    setCreateError(null);
    setCreateSuccess(null);
    setEditingCartId(null);
    setEditingName("");
    await loadCarts(householdId);
  }

  async function handleCreateCart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!selectedHouseholdId) {
      setCreateError("Please select a household first.");
      return;
    }

    setCreatePending(true);

    const result = await createCartAction({
      name,
      householdId: selectedHouseholdId,
    });

    if (result.error) {
      setCreateError(result.error);
      setCreatePending(false);
      return;
    }

    setName("");
    setCreateSuccess(result.success ?? "Cart created successfully.");
    await loadCarts(selectedHouseholdId);
    setCreatePending(false);
  }

  function startEditingCart(cart: Cart) {
    setCreateError(null);
    setCreateSuccess(null);
    setEditingCartId(cart.id);
    setEditingName(cart.name);
  }

  function cancelEditingCart() {
    setEditingCartId(null);
    setEditingName("");
  }

  async function handleSaveCartName(cartId: string) {
    setCreateError(null);
    setCreateSuccess(null);
    setUpdatePendingCartId(cartId);

    const result = await updateCartAction({
      cartId,
      name: editingName,
    });

    if (result.error) {
      setCreateError(result.error);
      setUpdatePendingCartId(null);
      return;
    }

    setEditingCartId(null);
    setEditingName("");
    setCreateSuccess(result.success ?? "Cart updated successfully.");
    await loadCarts(selectedHouseholdId);
    setUpdatePendingCartId(null);
  }

  async function handleDeleteCart(cartId: string, cartName: string) {
    const confirmed = window.confirm(
      `Delete cart \"${cartName}\"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setCreateError(null);
    setCreateSuccess(null);
    setDeletePendingCartId(cartId);

    const result = await deleteCartAction({ cartId });

    if (result.error) {
      setCreateError(result.error);
      setDeletePendingCartId(null);
      return;
    }

    if (editingCartId === cartId) {
      setEditingCartId(null);
      setEditingName("");
    }

    setCreateSuccess(result.success ?? "Cart deleted successfully.");
    await loadCarts(selectedHouseholdId);
    setDeletePendingCartId(null);
  }

  return (
    <section className="card-lift rounded-4xl border border-[#d8e9ef] bg-[linear-gradient(150deg,#f8fdff,#f3fff9)] p-6 shadow-[0_14px_30px_rgba(126,176,194,0.16)] animate-rise-in animate-delay-2 sm:p-7">
      <h2 className="inline-flex items-center gap-2 font-heading text-2xl font-semibold text-[#2f3550]">
        <ListChecks className="size-5 text-[#4c9ab0]" />
        Households and Carts
      </h2>
      <p className="mt-1 text-sm text-[#5f667f]">
        Select a household and create carts for that home.
      </p>

      {householdsError && (
        <p className="mt-4 rounded-2xl border border-[#efb8c8] bg-[#fff2f7] p-3 text-sm text-[#953f63]">
          {householdsError}
        </p>
      )}

      {!householdsError && households.length === 0 && (
        <p className="mt-4 text-sm text-[#5f667f]">No households found yet.</p>
      )}

      {!householdsError && households.length > 0 && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-3">
            {households.map((household, index) => {
              const isSelected = selectedHouseholdId === household.id;
              const status = formatHouseholdStatus(household);

              return (
                <article
                  key={household.id || household.name}
                  className="rounded-3xl border border-[#ecdcef] bg-[linear-gradient(145deg,#fff,#fff6fb)] p-4 shadow-[0_10px_22px_rgba(183,117,163,0.14)]"
                  style={{ animationDelay: `${80 * index}ms` }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-heading text-xl text-[#3a304d]">
                      {household.name}
                    </p>
                    <span className="inline-flex rounded-full border border-[#e7d8ef] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6c5b7a]">
                      {status}
                    </span>
                  </div>

                  <p className="mt-2 inline-flex items-center gap-2 text-sm text-[#655977]">
                    <UserRound className="size-4 text-[#57a3a3]" />
                    Created by: {formatHouseholdCreatedBy(household)}
                  </p>

                  <Button
                    type="button"
                    onClick={() => void handleSelectHousehold(household.id)}
                    className="mt-4 h-10 rounded-2xl border-0 bg-[linear-gradient(120deg,#d8f3ff,#e9f6ef)] px-4 font-semibold text-[#2f5466] shadow-[0_6px_14px_rgba(128,183,203,0.2)] hover:brightness-105"
                    disabled={isSelected}
                  >
                    {isSelected ? "Selected" : "View Carts"}
                  </Button>
                </article>
              );
            })}
          </div>

          <div className="rounded-3xl border border-[#d7e6ef] bg-white/75 p-5">
            <h3 className="font-heading text-2xl text-[#2f3550]">Household</h3>
            <p className="mt-1 text-sm text-[#5f667f]">
              {selectedHousehold
                ? selectedHousehold.name
                : "No household selected"}
            </p>

            <form className="mt-5 space-y-3" onSubmit={handleCreateCart}>
              <h4 className="inline-flex items-center gap-2 font-heading text-xl text-[#3a304d]">
                <ShoppingBasket className="size-5 text-[#cf6d9f]" />
                Create Cart
              </h4>

              <div className="space-y-2">
                <Label htmlFor="cart-name" className="text-[#4b4161]">
                  Cart Name
                </Label>
                <Input
                  id="cart-name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Weekly Groceries"
                  required
                  className="h-12 rounded-3xl border-[#e8cfe5] bg-white px-4 text-[#3d3550] placeholder:text-[#9f90ad] focus-visible:border-[#d98bb9] focus-visible:ring-[#d98bb9]/30"
                />
              </div>

              {createError && (
                <p className="rounded-2xl border border-[#efb8c8] bg-[#fff2f7] px-3 py-2 text-sm text-[#953f63]">
                  {createError}
                </p>
              )}

              {createSuccess && (
                <p className="rounded-2xl border border-[#bde0d8] bg-[#edfdf9] px-3 py-2 text-sm text-[#2a6c67]">
                  {createSuccess}
                </p>
              )}

              <Button
                type="submit"
                disabled={createPending || !selectedHouseholdId}
                className="h-11 rounded-3xl border-0 bg-[linear-gradient(120deg,#ffd1e2,#ffc6b8)] px-6 font-semibold text-[#5f2f4f] shadow-[0_10px_22px_rgba(214,130,173,0.24)] hover:brightness-105"
              >
                {createPending ? "Creating..." : "Create Cart"}
              </Button>
            </form>

            <div className="mt-6">
              <h4 className="font-heading text-xl text-[#3a304d]">Carts</h4>

              {cartsLoading && (
                <p className="mt-2 text-sm text-[#5f667f]">Loading carts...</p>
              )}

              {!cartsLoading && cartsError && (
                <p className="mt-2 rounded-2xl border border-[#efb8c8] bg-[#fff2f7] p-3 text-sm text-[#953f63]">
                  {cartsError}
                </p>
              )}

              {!cartsLoading && !cartsError && carts.length === 0 && (
                <p className="mt-2 text-sm text-[#5f667f]">
                  No carts found for this household.
                </p>
              )}

              {!cartsLoading && !cartsError && carts.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {carts.map((cart) => {
                    const status = formatCartStatus(cart);
                    const isEditing = editingCartId === cart.id;
                    const isUpdating = updatePendingCartId === cart.id;
                    const isDeleting = deletePendingCartId === cart.id;

                    return (
                      <li
                        key={cart.id || cart.name}
                        className="rounded-2xl border border-[#e8d9ef] bg-[linear-gradient(145deg,#fff,#fff8fc)] p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          {isEditing ? (
                            <Input
                              value={editingName}
                              onChange={(event) =>
                                setEditingName(event.target.value)
                              }
                              className="h-10 rounded-2xl border-[#e8cfe5] bg-white px-3 text-[#3d3550]"
                              disabled={isUpdating || isDeleting}
                              aria-label="Edit cart name"
                            />
                          ) : (
                            <p className="font-semibold text-[#3a304d]">
                              {cart.name}
                            </p>
                          )}
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${cartStatusBadge(status)}`}
                          >
                            {status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#655977]">
                          Created by: {cart.createdBy || "Unknown"}
                        </p>
                        <p className="mt-1 text-xs text-[#7a6d89]">
                          Active: {cart.isActive ? "Yes" : "No"} · Deleted:{" "}
                          {cart.isDeleted ? "Yes" : "No"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                onClick={() => void handleSaveCartName(cart.id)}
                                disabled={
                                  isUpdating ||
                                  isDeleting ||
                                  editingName.trim().length < 2
                                }
                                className="h-9 rounded-2xl border-0 bg-[linear-gradient(120deg,#d8f3ff,#e9f6ef)] px-4 text-xs font-semibold text-[#2f5466] shadow-[0_6px_14px_rgba(128,183,203,0.2)]"
                              >
                                {isUpdating ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={cancelEditingCart}
                                disabled={isUpdating || isDeleting}
                                className="h-9 rounded-2xl border-[#e8d2e5] bg-white px-4 text-xs font-semibold text-[#6a4c66]"
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => startEditingCart(cart)}
                                disabled={isDeleting}
                                className="h-9 rounded-2xl border-[#dce7ef] bg-white px-4 text-xs font-semibold text-[#39617a]"
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  void handleDeleteCart(cart.id, cart.name)
                                }
                                disabled={isDeleting || isUpdating}
                                className="h-9 rounded-2xl border-[#efc6d5] bg-white px-4 text-xs font-semibold text-[#8a3e61]"
                              >
                                {isDeleting ? "Deleting..." : "Delete"}
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
