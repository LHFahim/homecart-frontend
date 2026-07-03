import { auth } from "@/auth";

export type CartItemPriority = "LOW" | "NORMAL" | "HIGH";

export interface CartItem {
  id: string;
  name: string;
  cartId: string;
  householdId: string;
  createdBy: string;
  quantity: number;
  unit?: string;
  category?: string;
  image?: string;
  note?: string;
  estimatedPrice?: number;
  actualPrice?: number;
  addedBy: string;
  assignedTo?: string;
  isPurchased: boolean;
  purchasedBy?: string;
  purchasedAt?: string;
  priority: CartItemPriority;
  isActive: boolean;
  isDeleted: boolean;
}

export interface CreateCartItemPayload {
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  image?: string;
  note?: string;
  estimatedPrice?: number;
  actualPrice?: number;
  assignedTo?: string;
  priority: CartItemPriority;
}

export interface UpdateCartItemPayload {
  name?: string;
  quantity?: number;
  unit?: string;
  category?: string;
  image?: string;
  note?: string;
  estimatedPrice?: number;
  actualPrice?: number;
  assignedTo?: string;
  priority?: CartItemPriority;
}

function getApiBaseUrl(): string {
  const baseUrl = process.env.AUTH_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("AUTH_API_BASE_URL is not configured.");
  }

  return baseUrl;
}

function joinApiUrl(pathname: string): string {
  const baseUrl = getApiBaseUrl();

  return new URL(
    pathname.replace(/^\//, ""),
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  ).toString();
}

function toUrl(pathname: string): string {
  return joinApiUrl(pathname);
}

async function getAuthToken(): Promise<string> {
  const session = await auth();
  const token =
    session?.accessToken ??
    (session?.user as { accessToken?: string } | undefined)?.accessToken ??
    undefined;

  if (!token) {
    throw new Error("Missing authentication token. Please sign in again.");
  }

  return token;
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}.`;

  try {
    const payload: unknown = await response.json();
    const asRecord =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : null;
    const dataRecord =
      asRecord && asRecord.data && typeof asRecord.data === "object"
        ? (asRecord.data as Record<string, unknown>)
        : null;

    if (typeof asRecord?.message === "string") {
      return `${asRecord.message} (HTTP ${response.status})`;
    }

    if (typeof dataRecord?.message === "string") {
      return `${dataRecord.message} (HTTP ${response.status})`;
    }

    if (Array.isArray(asRecord?.errors)) {
      const firstError = asRecord.errors[0];

      if (typeof firstError === "string") {
        return `${firstError} (HTTP ${response.status})`;
      }

      if (
        firstError &&
        typeof firstError === "object" &&
        typeof (firstError as Record<string, unknown>).message === "string"
      ) {
        return `${(firstError as Record<string, string>).message} (HTTP ${response.status})`;
      }
    }

    return fallback;
  } catch {
    try {
      const textPayload = await response.text();

      if (textPayload) {
        return `${textPayload} (HTTP ${response.status})`;
      }
    } catch {
      return fallback;
    }

    return fallback;
  }
}

async function authedFetch<T>(pathname: string, init: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(init.headers ?? {});
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const hasBody = init.body !== undefined && init.body !== null;
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(toUrl(pathname), {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function normalizePriority(value: unknown): CartItemPriority {
  if (value === "LOW" || value === "HIGH") {
    return value;
  }

  return "NORMAL";
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function normalizeCartItem(item: unknown): CartItem {
  const asRecord =
    item && typeof item === "object" ? (item as Record<string, unknown>) : null;

  return {
    id: typeof asRecord?.id === "string" ? asRecord.id : "",
    name: typeof asRecord?.name === "string" ? asRecord.name : "Unnamed item",
    cartId: typeof asRecord?.cartId === "string" ? asRecord.cartId : "",
    householdId:
      typeof asRecord?.householdId === "string" ? asRecord.householdId : "",
    createdBy:
      typeof asRecord?.createdBy === "string" ? asRecord.createdBy : "",
    quantity:
      typeof asRecord?.quantity === "number" &&
      Number.isFinite(asRecord.quantity)
        ? asRecord.quantity
        : 1,
    unit: typeof asRecord?.unit === "string" ? asRecord.unit : undefined,
    category:
      typeof asRecord?.category === "string" ? asRecord.category : undefined,
    image: typeof asRecord?.image === "string" ? asRecord.image : undefined,
    note: typeof asRecord?.note === "string" ? asRecord.note : undefined,
    estimatedPrice: normalizeNumber(asRecord?.estimatedPrice),
    actualPrice: normalizeNumber(asRecord?.actualPrice),
    addedBy: typeof asRecord?.addedBy === "string" ? asRecord.addedBy : "",
    assignedTo:
      typeof asRecord?.assignedTo === "string"
        ? asRecord.assignedTo
        : undefined,
    isPurchased:
      typeof asRecord?.isPurchased === "boolean" ? asRecord.isPurchased : false,
    purchasedBy:
      typeof asRecord?.purchasedBy === "string"
        ? asRecord.purchasedBy
        : undefined,
    purchasedAt:
      typeof asRecord?.purchasedAt === "string"
        ? asRecord.purchasedAt
        : undefined,
    priority: normalizePriority(asRecord?.priority),
    isActive:
      typeof asRecord?.isActive === "boolean" ? asRecord.isActive : true,
    isDeleted:
      typeof asRecord?.isDeleted === "boolean" ? asRecord.isDeleted : false,
  };
}

function normalizeCartItemsResponse(payload: unknown): CartItem[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeCartItem);
  }

  const asRecord =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;

  const items =
    (Array.isArray(asRecord?.data) && asRecord.data) ||
    (Array.isArray(asRecord?.items) && asRecord.items) ||
    (Array.isArray(asRecord?.results) && asRecord.results) ||
    [];

  return items.map(normalizeCartItem);
}

function buildCreatePayload(
  payload: CreateCartItemPayload,
): CreateCartItemPayload {
  const requestPayload: CreateCartItemPayload = {
    name: payload.name,
    quantity: payload.quantity,
    priority: payload.priority,
  };

  if (payload.unit !== undefined && payload.unit !== "") {
    requestPayload.unit = payload.unit;
  }

  if (payload.category !== undefined && payload.category !== "") {
    requestPayload.category = payload.category;
  }

  if (payload.image !== undefined && payload.image !== "") {
    requestPayload.image = payload.image;
  }

  if (payload.note !== undefined && payload.note !== "") {
    requestPayload.note = payload.note;
  }

  if (payload.estimatedPrice !== undefined) {
    requestPayload.estimatedPrice = payload.estimatedPrice;
  }

  if (payload.actualPrice !== undefined) {
    requestPayload.actualPrice = payload.actualPrice;
  }

  if (payload.assignedTo !== undefined && payload.assignedTo !== "") {
    requestPayload.assignedTo = payload.assignedTo;
  }

  return requestPayload;
}

function buildUpdatePayload(
  payload: UpdateCartItemPayload,
): UpdateCartItemPayload {
  const requestPayload: UpdateCartItemPayload = {};

  if (payload.name !== undefined && payload.name !== "") {
    requestPayload.name = payload.name;
  }

  if (payload.quantity !== undefined) {
    requestPayload.quantity = payload.quantity;
  }

  if (payload.unit !== undefined && payload.unit !== "") {
    requestPayload.unit = payload.unit;
  }

  if (payload.category !== undefined && payload.category !== "") {
    requestPayload.category = payload.category;
  }

  if (payload.image !== undefined && payload.image !== "") {
    requestPayload.image = payload.image;
  }

  if (payload.note !== undefined && payload.note !== "") {
    requestPayload.note = payload.note;
  }

  if (payload.estimatedPrice !== undefined) {
    requestPayload.estimatedPrice = payload.estimatedPrice;
  }

  if (payload.actualPrice !== undefined) {
    requestPayload.actualPrice = payload.actualPrice;
  }

  if (payload.assignedTo !== undefined && payload.assignedTo !== "") {
    requestPayload.assignedTo = payload.assignedTo;
  }

  if (payload.priority !== undefined) {
    requestPayload.priority = payload.priority;
  }

  return requestPayload;
}

function assertNonEmptyId(id: string, label: string): void {
  if (!id || id.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }
}

export async function getCartItems(cartId: string): Promise<CartItem[]> {
  assertNonEmptyId(cartId, "Cart id");

  const response = await authedFetch<unknown>(`/carts/${cartId}/items`, {
    method: "GET",
  });

  return normalizeCartItemsResponse(response);
}

export async function createCartItem(
  cartId: string,
  payload: CreateCartItemPayload,
): Promise<CartItem> {
  assertNonEmptyId(cartId, "Cart id");

  const response = await authedFetch<unknown>(`/carts/${cartId}/items`, {
    method: "POST",
    body: JSON.stringify(buildCreatePayload(payload)),
  });

  return normalizeCartItem(response);
}

export async function getCartItemById(
  cartId: string,
  itemId: string,
): Promise<CartItem> {
  assertNonEmptyId(cartId, "Cart id");
  assertNonEmptyId(itemId, "Item id");

  const response = await authedFetch<unknown>(
    `/carts/${cartId}/items/${itemId}`,
    {
      method: "GET",
    },
  );

  return normalizeCartItem(response);
}

export async function updateCartItem(
  cartId: string,
  itemId: string,
  payload: UpdateCartItemPayload,
): Promise<CartItem> {
  assertNonEmptyId(cartId, "Cart id");
  assertNonEmptyId(itemId, "Item id");

  const response = await authedFetch<unknown>(
    `/carts/${cartId}/items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(buildUpdatePayload(payload)),
    },
  );

  return normalizeCartItem(response);
}

export async function deleteCartItem(
  cartId: string,
  itemId: string,
): Promise<void> {
  assertNonEmptyId(cartId, "Cart id");
  assertNonEmptyId(itemId, "Item id");

  await authedFetch<void>(`/carts/${cartId}/items/${itemId}`, {
    method: "DELETE",
  });
}
