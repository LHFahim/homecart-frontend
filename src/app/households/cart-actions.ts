"use server";

import { z } from "zod";

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
