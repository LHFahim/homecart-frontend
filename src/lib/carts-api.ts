import { auth } from "@/auth";

export type CartStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface Cart {
  id: string;
  name: string;
  householdId: string;
  createdBy: string;
  status: CartStatus;
  completedAt?: string;
  isActive: boolean;
  isDeleted: boolean;
}

export interface CreateCartPayload {
  name: string;
  householdId: string;
}

export interface UpdateCartPayload {
  name?: string;
  householdId?: string;
}

export interface CartPaginatedResponse {
  data: Cart[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface GetCartsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sort?: "asc" | "desc";
  householdId?: string;
}

const DEFAULT_CARTS_SORT: Required<Pick<GetCartsParams, "sortBy" | "sort">> = {
  sortBy: "createdAt",
  sort: "desc",
};

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

function toUrl(pathname: string, params?: GetCartsParams): string {
  const url = new URL(joinApiUrl(pathname));

  if (params) {
    const entries = Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    );

    for (const [key, value] of entries) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
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

async function authedFetch<T>(
  pathname: string,
  init: RequestInit,
  params?: GetCartsParams,
): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(init.headers ?? {});
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const hasBody = init.body !== undefined && init.body !== null;
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(toUrl(pathname, params), {
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

function normalizeStatus(value: unknown): CartStatus {
  if (value === "COMPLETED" || value === "CANCELLED") {
    return value;
  }

  return "ACTIVE";
}

function normalizeCart(item: unknown): Cart {
  const asRecord =
    item && typeof item === "object" ? (item as Record<string, unknown>) : null;

  return {
    id: typeof asRecord?.id === "string" ? asRecord.id : "",
    name: typeof asRecord?.name === "string" ? asRecord.name : "Unnamed cart",
    householdId:
      typeof asRecord?.householdId === "string" ? asRecord.householdId : "",
    createdBy:
      typeof asRecord?.createdBy === "string" ? asRecord.createdBy : "",
    status: normalizeStatus(asRecord?.status),
    completedAt:
      typeof asRecord?.completedAt === "string"
        ? asRecord.completedAt
        : undefined,
    isActive:
      typeof asRecord?.isActive === "boolean" ? asRecord.isActive : true,
    isDeleted:
      typeof asRecord?.isDeleted === "boolean" ? asRecord.isDeleted : false,
  };
}

function normalizePaginatedResponse(payload: unknown): CartPaginatedResponse {
  if (Array.isArray(payload)) {
    return {
      data: payload.map(normalizeCart),
      page: 1,
      pageSize: payload.length,
      total: payload.length,
      totalPages: 1,
    };
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

  const total =
    typeof asRecord?.total === "number"
      ? asRecord.total
      : typeof asRecord?.count === "number"
        ? asRecord.count
        : items.length;

  const page = typeof asRecord?.page === "number" ? asRecord.page : 1;
  const pageSize =
    typeof asRecord?.pageSize === "number"
      ? asRecord.pageSize
      : typeof asRecord?.limit === "number"
        ? asRecord.limit
        : items.length;

  const totalPages =
    typeof asRecord?.totalPages === "number"
      ? asRecord.totalPages
      : Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  return {
    data: items.map(normalizeCart),
    page,
    pageSize,
    total,
    totalPages,
  };
}

export async function getCarts(
  params?: GetCartsParams,
): Promise<CartPaginatedResponse> {
  const resolvedParams: GetCartsParams = {
    ...DEFAULT_CARTS_SORT,
    ...(params ?? {}),
  };

  if (!resolvedParams.sortBy) {
    resolvedParams.sortBy = DEFAULT_CARTS_SORT.sortBy;
  }

  if (!resolvedParams.sort) {
    resolvedParams.sort = DEFAULT_CARTS_SORT.sort;
  }

  const payload = await authedFetch<unknown>(
    "/carts",
    { method: "GET" },
    resolvedParams,
  );

  return normalizePaginatedResponse(payload);
}

export async function createCart(payload: CreateCartPayload): Promise<Cart> {
  const response = await authedFetch<unknown>("/carts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return normalizeCart(response);
}

export async function getCartById(id: string): Promise<Cart> {
  const response = await authedFetch<unknown>(`/carts/${id}`, {
    method: "GET",
  });

  return normalizeCart(response);
}

export async function updateCart(
  id: string,
  payload: UpdateCartPayload,
): Promise<Cart> {
  const response = await authedFetch<unknown>(`/carts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return normalizeCart(response);
}

export async function deleteCart(id: string): Promise<void> {
  await authedFetch<void>(`/carts/${id}`, {
    method: "DELETE",
  });
}
