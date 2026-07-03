"use server";

import { z } from "zod";

import {
  createCartItem,
  deleteCartItem,
  getCartItems,
  updateCartItem,
  type CartItemPriority,
} from "@/lib/cart-items-api";
import { createCart, deleteCart, getCarts, updateCart } from "@/lib/carts-api";

const householdIdSchema = z.string().min(1, "Household selection is required.");
const createCartSchema = z.object({
  name: z.string().trim().min(2, "Cart name must be at least 2 characters."),
  householdId: z.string().min(1, "Household selection is required."),
});
const updateCartSchema = z.object({
  cartId: z.string().min(1, "Cart id is required."),
  name: z.string().trim().min(2, "Cart name must be at least 2 characters."),
});
const deleteCartSchema = z.object({
  cartId: z.string().min(1, "Cart id is required."),
});
const cartIdSchema = z.string().min(1, "Cart id is required.");
const createCartItemSchema = z.object({
  cartId: z.string().min(1, "Cart id is required."),
  name: z.string().trim().min(1, "Item name is required."),
  quantity: z.number().positive("Quantity must be greater than 0."),
  unit: z.string().trim().optional(),
  category: z.string().trim().optional(),
  note: z.string().trim().optional(),
  estimatedPrice: z.number().nonnegative().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]),
});
const updateCartItemSchema = z.object({
  cartId: z.string().min(1, "Cart id is required."),
  itemId: z.string().min(1, "Item id is required."),
  name: z.string().trim().min(1, "Item name is required."),
  quantity: z.number().positive("Quantity must be greater than 0."),
  unit: z.string().trim().optional(),
  category: z.string().trim().optional(),
  note: z.string().trim().optional(),
  estimatedPrice: z.number().nonnegative().optional(),
  actualPrice: z.number().nonnegative().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]),
});
const deleteCartItemSchema = z.object({
  cartId: z.string().min(1, "Cart id is required."),
  itemId: z.string().min(1, "Item id is required."),
});

export interface LoadHouseholdCartsResult {
  carts?: Awaited<ReturnType<typeof getCarts>>["data"];
  error?: string;
}

export async function getHouseholdCartsAction(
  householdId: string,
): Promise<LoadHouseholdCartsResult> {
  const parsedHouseholdId = householdIdSchema.safeParse(householdId);

  if (!parsedHouseholdId.success) {
    return {
      error: parsedHouseholdId.error.issues[0]?.message ?? "Invalid household.",
    };
  }

  try {
    const response = await getCarts({ householdId: parsedHouseholdId.data });

    return {
      carts: response.data,
    };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to load carts for this household.",
    };
  }
}

export interface CreateCartActionInput {
  name: string;
  householdId: string;
}

export interface CreateCartActionResult {
  success?: string;
  error?: string;
  fieldErrors?: {
    name?: string[];
    householdId?: string[];
  };
  createdAt?: number;
}

export async function createCartAction(
  input: CreateCartActionInput,
): Promise<CreateCartActionResult> {
  const parsedInput = createCartSchema.safeParse(input);

  if (!parsedInput.success) {
    const fieldErrors = parsedInput.error.flatten().fieldErrors;

    return {
      error: "Please fix the form errors and try again.",
      fieldErrors: {
        name: fieldErrors.name,
        householdId: fieldErrors.householdId,
      },
    };
  }

  try {
    await createCart({
      name: parsedInput.data.name,
      householdId: parsedInput.data.householdId,
    });

    return {
      success: "Cart created successfully.",
      createdAt: Date.now(),
    };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to create cart right now.",
    };
  }
}

export interface UpdateCartActionInput {
  cartId: string;
  name: string;
}

export interface UpdateCartActionResult {
  success?: string;
  error?: string;
  fieldErrors?: {
    cartId?: string[];
    name?: string[];
  };
}

export async function updateCartAction(
  input: UpdateCartActionInput,
): Promise<UpdateCartActionResult> {
  const parsedInput = updateCartSchema.safeParse(input);

  if (!parsedInput.success) {
    const fieldErrors = parsedInput.error.flatten().fieldErrors;

    return {
      error: "Please fix the form errors and try again.",
      fieldErrors: {
        cartId: fieldErrors.cartId,
        name: fieldErrors.name,
      },
    };
  }

  try {
    await updateCart(parsedInput.data.cartId, {
      name: parsedInput.data.name,
    });

    return {
      success: "Cart updated successfully.",
    };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to update cart right now.",
    };
  }
}

export interface DeleteCartActionInput {
  cartId: string;
}

export interface DeleteCartActionResult {
  success?: string;
  error?: string;
  fieldErrors?: {
    cartId?: string[];
  };
}

export async function deleteCartAction(
  input: DeleteCartActionInput,
): Promise<DeleteCartActionResult> {
  const parsedInput = deleteCartSchema.safeParse(input);

  if (!parsedInput.success) {
    const fieldErrors = parsedInput.error.flatten().fieldErrors;

    return {
      error: "Unable to delete cart.",
      fieldErrors: {
        cartId: fieldErrors.cartId,
      },
    };
  }

  try {
    await deleteCart(parsedInput.data.cartId);

    return {
      success: "Cart deleted successfully.",
    };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete cart right now.",
    };
  }
}

export interface LoadCartItemsResult {
  items?: Awaited<ReturnType<typeof getCartItems>>;
  error?: string;
}

export async function getCartItemsAction(
  cartId: string,
): Promise<LoadCartItemsResult> {
  const parsedCartId = cartIdSchema.safeParse(cartId);

  if (!parsedCartId.success) {
    return {
      error: parsedCartId.error.issues[0]?.message ?? "Invalid cart.",
    };
  }

  try {
    const items = await getCartItems(parsedCartId.data);

    return {
      items,
    };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to load items for this cart.",
    };
  }
}

export interface CreateCartItemActionInput {
  cartId: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  note?: string;
  estimatedPrice?: number;
  priority: CartItemPriority;
}

export interface CreateCartItemActionResult {
  success?: string;
  error?: string;
  fieldErrors?: {
    cartId?: string[];
    name?: string[];
    quantity?: string[];
    unit?: string[];
    category?: string[];
    note?: string[];
    estimatedPrice?: string[];
    priority?: string[];
  };
}

export async function createCartItemAction(
  input: CreateCartItemActionInput,
): Promise<CreateCartItemActionResult> {
  const parsedInput = createCartItemSchema.safeParse(input);

  if (!parsedInput.success) {
    const fieldErrors = parsedInput.error.flatten().fieldErrors;

    return {
      error: "Please fix the form errors and try again.",
      fieldErrors: {
        cartId: fieldErrors.cartId,
        name: fieldErrors.name,
        quantity: fieldErrors.quantity,
        unit: fieldErrors.unit,
        category: fieldErrors.category,
        note: fieldErrors.note,
        estimatedPrice: fieldErrors.estimatedPrice,
        priority: fieldErrors.priority,
      },
    };
  }

  try {
    await createCartItem(parsedInput.data.cartId, {
      name: parsedInput.data.name,
      quantity: parsedInput.data.quantity,
      unit:
        parsedInput.data.unit && parsedInput.data.unit.length > 0
          ? parsedInput.data.unit
          : undefined,
      category:
        parsedInput.data.category && parsedInput.data.category.length > 0
          ? parsedInput.data.category
          : undefined,
      note:
        parsedInput.data.note && parsedInput.data.note.length > 0
          ? parsedInput.data.note
          : undefined,
      estimatedPrice: parsedInput.data.estimatedPrice,
      priority: parsedInput.data.priority,
    });

    return {
      success: "Item added successfully.",
    };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to add item right now.",
    };
  }
}

export interface UpdateCartItemActionInput {
  cartId: string;
  itemId: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  note?: string;
  estimatedPrice?: number;
  actualPrice?: number;
  priority: CartItemPriority;
}

export interface UpdateCartItemActionResult {
  success?: string;
  error?: string;
  fieldErrors?: {
    cartId?: string[];
    itemId?: string[];
    name?: string[];
    quantity?: string[];
    unit?: string[];
    category?: string[];
    note?: string[];
    estimatedPrice?: string[];
    actualPrice?: string[];
    priority?: string[];
  };
}

export async function updateCartItemAction(
  input: UpdateCartItemActionInput,
): Promise<UpdateCartItemActionResult> {
  const parsedInput = updateCartItemSchema.safeParse(input);

  if (!parsedInput.success) {
    const fieldErrors = parsedInput.error.flatten().fieldErrors;

    return {
      error: "Please fix the form errors and try again.",
      fieldErrors: {
        cartId: fieldErrors.cartId,
        itemId: fieldErrors.itemId,
        name: fieldErrors.name,
        quantity: fieldErrors.quantity,
        unit: fieldErrors.unit,
        category: fieldErrors.category,
        note: fieldErrors.note,
        estimatedPrice: fieldErrors.estimatedPrice,
        actualPrice: fieldErrors.actualPrice,
        priority: fieldErrors.priority,
      },
    };
  }

  try {
    await updateCartItem(parsedInput.data.cartId, parsedInput.data.itemId, {
      name: parsedInput.data.name,
      quantity: parsedInput.data.quantity,
      unit:
        parsedInput.data.unit && parsedInput.data.unit.length > 0
          ? parsedInput.data.unit
          : undefined,
      category:
        parsedInput.data.category && parsedInput.data.category.length > 0
          ? parsedInput.data.category
          : undefined,
      note:
        parsedInput.data.note && parsedInput.data.note.length > 0
          ? parsedInput.data.note
          : undefined,
      estimatedPrice: parsedInput.data.estimatedPrice,
      actualPrice: parsedInput.data.actualPrice,
      priority: parsedInput.data.priority,
    });

    return {
      success: "Item updated successfully.",
    };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to update item right now.",
    };
  }
}

export interface DeleteCartItemActionInput {
  cartId: string;
  itemId: string;
}

export interface DeleteCartItemActionResult {
  success?: string;
  error?: string;
  fieldErrors?: {
    cartId?: string[];
    itemId?: string[];
  };
}

export async function deleteCartItemAction(
  input: DeleteCartItemActionInput,
): Promise<DeleteCartItemActionResult> {
  const parsedInput = deleteCartItemSchema.safeParse(input);

  if (!parsedInput.success) {
    const fieldErrors = parsedInput.error.flatten().fieldErrors;

    return {
      error: "Unable to delete item.",
      fieldErrors: {
        cartId: fieldErrors.cartId,
        itemId: fieldErrors.itemId,
      },
    };
  }

  try {
    await deleteCartItem(parsedInput.data.cartId, parsedInput.data.itemId);

    return {
      success: "Item deleted successfully.",
    };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete item right now.",
    };
  }
}
