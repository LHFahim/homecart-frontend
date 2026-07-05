"use client";

import { ArrowLeft, ListChecks } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  createCartItemAction,
  deleteCartItemAction,
  getCartItemsAction,
  updateCartItemAction,
} from "@/app/households/cart-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CartItem, CartItemPriority } from "@/lib/cart-items-api";

interface CartItemsPanelProps {
  cartId: string;
  householdName: string;
  cartName: string;
  initialItems: CartItem[];
  initialError: string | null;
}

export function CartItemsPanel({
  cartId,
  householdName,
  cartName,
  initialItems,
  initialError,
}: CartItemsPanelProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>(initialItems);
  const [cartItemsLoading, setCartItemsLoading] = useState(false);
  const [cartItemsError, setCartItemsError] = useState<string | null>(
    initialError,
  );
  const [itemPending, setItemPending] = useState(false);
  const [itemSuccess, setItemSuccess] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingItemQuantity, setEditingItemQuantity] = useState("1");
  const [editingItemNote, setEditingItemNote] = useState("");
  const [editingItemEstimatedPrice, setEditingItemEstimatedPrice] =
    useState("");
  const [editingItemActualPrice, setEditingItemActualPrice] = useState("");
  const [editingItemPriority, setEditingItemPriority] =
    useState<CartItemPriority>("NORMAL");
  const [itemUpdatePendingId, setItemUpdatePendingId] = useState<string | null>(
    null,
  );
  const [itemDeletePendingId, setItemDeletePendingId] = useState<string | null>(
    null,
  );

  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemNote, setItemNote] = useState("");
  const [itemEstimatedPrice, setItemEstimatedPrice] = useState("");
  const [itemPriority, setItemPriority] = useState<CartItemPriority>("NORMAL");

  async function loadCartItems() {
    setCartItemsLoading(true);
    setCartItemsError(null);

    const result = await getCartItemsAction(cartId);

    if (result.error) {
      setCartItems([]);
      setCartItemsError(result.error);
      setCartItemsLoading(false);
      return;
    }

    setCartItems(result.items ?? []);
    setCartItemsLoading(false);
  }

  function startEditingItem(item: CartItem) {
    setItemError(null);
    setItemSuccess(null);
    setEditingItemId(item.id);
    setEditingItemName(item.name);
    setEditingItemQuantity(String(item.quantity));
    setEditingItemNote(item.note ?? "");
    setEditingItemEstimatedPrice(
      typeof item.estimatedPrice === "number"
        ? String(item.estimatedPrice)
        : "",
    );
    setEditingItemActualPrice(
      typeof item.actualPrice === "number" ? String(item.actualPrice) : "",
    );
    setEditingItemPriority(item.priority ?? "NORMAL");
  }

  function cancelEditingItem() {
    setEditingItemId(null);
    setEditingItemName("");
    setEditingItemQuantity("1");
    setEditingItemNote("");
    setEditingItemEstimatedPrice("");
    setEditingItemActualPrice("");
    setEditingItemPriority("NORMAL");
  }

  async function handleCreateItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setItemError(null);
    setItemSuccess(null);

    const quantityNumber = Number(itemQuantity);

    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      setItemError("Quantity must be a number greater than 0.");
      return;
    }

    let estimatedPriceNumber: number | undefined;
    if (itemEstimatedPrice.trim().length > 0) {
      const parsedEstimatedPrice = Number(itemEstimatedPrice);

      if (!Number.isFinite(parsedEstimatedPrice) || parsedEstimatedPrice < 0) {
        setItemError("Estimated price must be a valid non-negative number.");
        return;
      }

      estimatedPriceNumber = parsedEstimatedPrice;
    }

    setItemPending(true);

    const result = await createCartItemAction({
      cartId,
      name: itemName,
      quantity: quantityNumber,
      note: itemNote.trim().length > 0 ? itemNote.trim() : undefined,
      estimatedPrice: estimatedPriceNumber,
      priority: itemPriority,
    });

    if (result.error) {
      setItemError(result.error);
      setItemPending(false);
      return;
    }

    setItemName("");
    setItemQuantity("1");
    setItemNote("");
    setItemEstimatedPrice("");
    setItemPriority("NORMAL");
    setItemSuccess(result.success ?? "Item added successfully.");
    setIsAddItemModalOpen(false);
    await loadCartItems();
    setItemPending(false);
  }

  async function handleUpdateItem(itemId: string) {
    const quantityNumber = Number(editingItemQuantity);

    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      setItemError("Quantity must be a number greater than 0.");
      return;
    }

    let estimatedPriceNumber: number | undefined;
    if (editingItemEstimatedPrice.trim().length > 0) {
      const parsedEstimatedPrice = Number(editingItemEstimatedPrice);

      if (!Number.isFinite(parsedEstimatedPrice) || parsedEstimatedPrice < 0) {
        setItemError("Estimated price must be a valid non-negative number.");
        return;
      }

      estimatedPriceNumber = parsedEstimatedPrice;
    }

    let actualPriceNumber: number | undefined;
    if (editingItemActualPrice.trim().length > 0) {
      const parsedActualPrice = Number(editingItemActualPrice);

      if (!Number.isFinite(parsedActualPrice) || parsedActualPrice < 0) {
        setItemError("Actual price must be a valid non-negative number.");
        return;
      }

      actualPriceNumber = parsedActualPrice;
    }

    setItemError(null);
    setItemSuccess(null);
    setItemUpdatePendingId(itemId);

    const result = await updateCartItemAction({
      cartId,
      itemId,
      name: editingItemName,
      quantity: quantityNumber,
      note:
        editingItemNote.trim().length > 0 ? editingItemNote.trim() : undefined,
      estimatedPrice: estimatedPriceNumber,
      actualPrice: actualPriceNumber,
      priority: editingItemPriority,
    });

    if (result.error) {
      setItemError(result.error);
      setItemUpdatePendingId(null);
      return;
    }

    cancelEditingItem();
    setItemSuccess(result.success ?? "Item updated successfully.");
    await loadCartItems();
    setItemUpdatePendingId(null);
  }

  async function handleDeleteItem(itemId: string, itemNameValue: string) {
    const confirmed = window.confirm(
      `Delete item \"${itemNameValue}\"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setItemError(null);
    setItemSuccess(null);
    setItemDeletePendingId(itemId);

    const result = await deleteCartItemAction({
      cartId,
      itemId,
    });

    if (result.error) {
      setItemError(result.error);
      setItemDeletePendingId(null);
      return;
    }

    if (editingItemId === itemId) {
      cancelEditingItem();
    }

    setItemSuccess(result.success ?? "Item deleted successfully.");
    await loadCartItems();
    setItemDeletePendingId(null);
  }

  return (
    <section className="card-lift rounded-4xl border border-[#d8e9ef] bg-[linear-gradient(150deg,#f8fdff,#f3fff9)] p-6 shadow-[0_14px_30px_rgba(126,176,194,0.16)] animate-rise-in animate-delay-2 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 font-heading text-2xl font-semibold text-[#2f3550]">
            <ListChecks className="size-5 text-[#4c9ab0]" />
            Cart Items
          </h2>
          <p className="mt-1 text-sm text-[#5f667f]">
            Household: {householdName} | Cart: {cartName}
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="h-10 rounded-2xl border-[#cfe3ef] bg-white px-4 text-xs font-semibold text-[#2d5d77]"
        >
          <Link href="/households" className="inline-flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Back to Households
          </Link>
        </Button>
      </div>

      <div className="mt-5 rounded-3xl border border-[#dce8ef] bg-white/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading text-xl text-[#2f3550]">Items</h3>
          <Button
            type="button"
            onClick={() => {
              setItemError(null);
              setIsAddItemModalOpen(true);
            }}
            className="h-10 rounded-2xl border-0 bg-[linear-gradient(120deg,#ffd1e2,#ffc6b8)] px-5 font-semibold text-[#5f2f4f] shadow-[0_10px_22px_rgba(214,130,173,0.24)]"
          >
            Add Item
          </Button>
        </div>

        {itemSuccess && (
          <p className="mt-3 rounded-2xl border border-[#bde0d8] bg-[#edfdf9] px-3 py-2 text-sm text-[#2a6c67]">
            {itemSuccess}
          </p>
        )}

        {!isAddItemModalOpen && itemError && (
          <p className="mt-3 rounded-2xl border border-[#efb8c8] bg-[#fff2f7] p-3 text-sm text-[#953f63]">
            {itemError}
          </p>
        )}

        {cartItemsLoading && (
          <p className="mt-3 text-sm text-[#5f667f]">Loading items...</p>
        )}

        {!cartItemsLoading && cartItemsError && (
          <p className="mt-3 rounded-2xl border border-[#efb8c8] bg-[#fff2f7] p-3 text-sm text-[#953f63]">
            {cartItemsError}
          </p>
        )}

        {!cartItemsLoading && !cartItemsError && cartItems.length === 0 && (
          <p className="mt-3 text-sm text-[#5f667f]">
            No items found for this cart.
          </p>
        )}

        {!cartItemsLoading && !cartItemsError && cartItems.length > 0 && (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {cartItems.map((item) => {
              const isEditingItem = editingItemId === item.id;
              const isUpdatingItem = itemUpdatePendingId === item.id;
              const isDeletingItem = itemDeletePendingId === item.id;

              return (
                <li
                  key={item.id || item.name}
                  className="rounded-2xl border border-[#e8d9ef] bg-[linear-gradient(145deg,#fff,#fff8fc)] p-4"
                >
                  {isEditingItem ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label
                          htmlFor={`item-edit-name-${item.id}`}
                          className="text-[#4b4161]"
                        >
                          Name
                        </Label>
                        <Input
                          id={`item-edit-name-${item.id}`}
                          value={editingItemName}
                          onChange={(event) =>
                            setEditingItemName(event.target.value)
                          }
                          className="h-10 rounded-2xl border-[#e8cfe5] bg-white px-3 text-[#3d3550]"
                          disabled={isUpdatingItem || isDeletingItem}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor={`item-edit-quantity-${item.id}`}
                            className="text-[#4b4161]"
                          >
                            Quantity
                          </Label>
                          <Input
                            id={`item-edit-quantity-${item.id}`}
                            type="number"
                            min="1"
                            step="1"
                            value={editingItemQuantity}
                            onChange={(event) =>
                              setEditingItemQuantity(event.target.value)
                            }
                            className="h-10 rounded-2xl border-[#e8cfe5] bg-white px-3 text-[#3d3550]"
                            disabled={isUpdatingItem || isDeletingItem}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor={`item-edit-priority-${item.id}`}
                            className="text-[#4b4161]"
                          >
                            Priority
                          </Label>
                          <select
                            id={`item-edit-priority-${item.id}`}
                            value={editingItemPriority}
                            onChange={(event) =>
                              setEditingItemPriority(
                                event.target.value as CartItemPriority,
                              )
                            }
                            className="h-10 w-full rounded-2xl border border-[#e8cfe5] bg-white px-3 text-sm text-[#3d3550]"
                            disabled={isUpdatingItem || isDeletingItem}
                          >
                            <option value="LOW">LOW</option>
                            <option value="NORMAL">NORMAL</option>
                            <option value="HIGH">HIGH</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor={`item-edit-estimated-${item.id}`}
                            className="text-[#4b4161]"
                          >
                            Estimated Price
                          </Label>
                          <Input
                            id={`item-edit-estimated-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingItemEstimatedPrice}
                            onChange={(event) =>
                              setEditingItemEstimatedPrice(event.target.value)
                            }
                            className="h-10 rounded-2xl border-[#e8cfe5] bg-white px-3 text-[#3d3550]"
                            disabled={isUpdatingItem || isDeletingItem}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor={`item-edit-actual-${item.id}`}
                            className="text-[#4b4161]"
                          >
                            Actual Price
                          </Label>
                          <Input
                            id={`item-edit-actual-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingItemActualPrice}
                            onChange={(event) =>
                              setEditingItemActualPrice(event.target.value)
                            }
                            className="h-10 rounded-2xl border-[#e8cfe5] bg-white px-3 text-[#3d3550]"
                            disabled={isUpdatingItem || isDeletingItem}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor={`item-edit-note-${item.id}`}
                          className="text-[#4b4161]"
                        >
                          Note
                        </Label>
                        <Input
                          id={`item-edit-note-${item.id}`}
                          value={editingItemNote}
                          onChange={(event) =>
                            setEditingItemNote(event.target.value)
                          }
                          className="h-10 rounded-2xl border-[#e8cfe5] bg-white px-3 text-[#3d3550]"
                          disabled={isUpdatingItem || isDeletingItem}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => void handleUpdateItem(item.id)}
                          disabled={
                            isUpdatingItem ||
                            isDeletingItem ||
                            editingItemName.trim().length === 0
                          }
                          className="h-9 rounded-2xl border-0 bg-[linear-gradient(120deg,#d8f3ff,#e9f6ef)] px-4 text-xs font-semibold text-[#2f5466]"
                        >
                          {isUpdatingItem ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={cancelEditingItem}
                          disabled={isUpdatingItem || isDeletingItem}
                          className="h-9 rounded-2xl border-[#e8d2e5] bg-white px-4 text-xs font-semibold text-[#6a4c66]"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-[#3a304d]">
                        {item.name}
                      </p>
                      <p className="mt-1 text-sm text-[#655977]">
                        Quantity: {item.quantity}
                      </p>
                      <p className="mt-1 text-sm text-[#655977]">
                        Priority: {item.priority}
                      </p>
                      {typeof item.estimatedPrice === "number" && (
                        <p className="mt-1 text-sm text-[#655977]">
                          Estimated Price: ${item.estimatedPrice.toFixed(2)}
                        </p>
                      )}
                      {typeof item.actualPrice === "number" && (
                        <p className="mt-1 text-sm text-[#655977]">
                          Actual Price: ${item.actualPrice.toFixed(2)}
                        </p>
                      )}
                      {item.note && (
                        <p className="mt-1 text-sm text-[#655977]">
                          Note: {item.note}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-[#7a6d89]">
                        Purchased: {item.isPurchased ? "Yes" : "No"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => startEditingItem(item)}
                          disabled={isDeletingItem}
                          className="h-9 rounded-2xl border-[#dce7ef] bg-white px-4 text-xs font-semibold text-[#39617a]"
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            void handleDeleteItem(item.id, item.name)
                          }
                          disabled={isDeletingItem || isUpdatingItem}
                          className="h-9 rounded-2xl border-[#efc6d5] bg-white px-4 text-xs font-semibold text-[#8a3e61]"
                        >
                          {isDeletingItem ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#2f2a42]/30 p-4 sm:items-center">
          <div className="my-3 w-full max-w-3xl rounded-3xl border border-[#dce8ef] bg-white p-5 shadow-[0_24px_50px_rgba(70,65,94,0.25)] sm:my-0 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-2xl text-[#2f3550]">Add Item</h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddItemModalOpen(false)}
                className="h-9 rounded-2xl border-[#dce7ef] bg-white px-4 text-xs font-semibold text-[#39617a]"
              >
                Close
              </Button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleCreateItem}>
              <div className="space-y-2">
                <Label htmlFor="item-name" className="text-[#4b4161]">
                  Item Name
                </Label>
                <Input
                  id="item-name"
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                  placeholder="e.g. Milk"
                  required
                  className="h-11 rounded-2xl border-[#e8cfe5] bg-white px-4 text-[#3d3550]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="item-quantity" className="text-[#4b4161]">
                    Quantity
                  </Label>
                  <Input
                    id="item-quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={itemQuantity}
                    onChange={(event) => setItemQuantity(event.target.value)}
                    className="h-11 rounded-2xl border-[#e8cfe5] bg-white px-4 text-[#3d3550]"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="item-estimated-price"
                    className="text-[#4b4161]"
                  >
                    Estimated Price
                  </Label>
                  <Input
                    id="item-estimated-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemEstimatedPrice}
                    onChange={(event) =>
                      setItemEstimatedPrice(event.target.value)
                    }
                    placeholder="e.g. 4.99"
                    className="h-11 rounded-2xl border-[#e8cfe5] bg-white px-4 text-[#3d3550]"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                <div className="space-y-2">
                  <Label htmlFor="item-note" className="text-[#4b4161]">
                    Note
                  </Label>
                  <Input
                    id="item-note"
                    value={itemNote}
                    onChange={(event) => setItemNote(event.target.value)}
                    placeholder="Optional note"
                    className="h-11 rounded-2xl border-[#e8cfe5] bg-white px-4 text-[#3d3550]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item-priority" className="text-[#4b4161]">
                    Priority
                  </Label>
                  <select
                    id="item-priority"
                    value={itemPriority}
                    onChange={(event) =>
                      setItemPriority(event.target.value as CartItemPriority)
                    }
                    className="h-11 w-full rounded-2xl border border-[#e8cfe5] bg-white px-4 text-sm text-[#3d3550]"
                  >
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>
              </div>

              {itemError && (
                <p className="rounded-2xl border border-[#efb8c8] bg-[#fff2f7] px-3 py-2 text-sm text-[#953f63]">
                  {itemError}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={itemPending}
                  className="h-10 rounded-2xl border-0 bg-[linear-gradient(120deg,#ffd1e2,#ffc6b8)] px-5 font-semibold text-[#5f2f4f] shadow-[0_10px_22px_rgba(214,130,173,0.24)]"
                >
                  {itemPending ? "Adding..." : "Add Item"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddItemModalOpen(false)}
                  disabled={itemPending}
                  className="h-10 rounded-2xl border-[#dce7ef] bg-white px-5 text-xs font-semibold text-[#39617a]"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
