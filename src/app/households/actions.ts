"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createHousehold, getCurrentUserId } from "@/lib/households-api";

const createHouseholdSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Household name is required." })
    .max(100, { message: "Household name is too long." }),
});

export type CreateHouseholdFormState =
  | {
      success?: string;
      error?: string;
      fieldErrors?: {
        name?: string[];
      };
      createdAt?: number;
    }
  | undefined;

export async function createHouseholdAction(
  _previousState: CreateHouseholdFormState,
  formData: FormData,
): Promise<CreateHouseholdFormState> {
  const parsed = createHouseholdSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "Please correct the highlighted field.",
    };
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    // TODO: Replace this guard once auth/session always includes a stable backend user id.
    return {
      error:
        "Unable to create household because your user id is missing. Please sign in again.",
    };
  }

  try {
    await createHousehold({
      name: parsed.data.name,
      settings: {
        currency: "AUD",
        timezone: "Australia/Melbourne",
        weekStartsOn: "MONDAY",
      },
      members: [userId],
    });

    revalidatePath("/households");

    return {
      success: "Household created successfully.",
      createdAt: Date.now(),
    };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to create household right now. Please try again.",
    };
  }
}
