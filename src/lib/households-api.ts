import { auth } from "@/auth";

export type WeekStartsOn =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

export interface HouseholdSettings {
  currency: string;
  timezone: string;
  weekStartsOn: WeekStartsOn;
}

export interface HouseholdMember {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface Household {
  id: string;
  name: string;
  settings?: HouseholdSettings | null;
  members?: HouseholdMember[];
  createdBy?: string | HouseholdMember | null;
  status?: string | null;
  isActive?: boolean | null;
  deletedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateHouseholdPayload {
  name: string;
  settings?: HouseholdSettings;
  members: string[];
}

export interface HouseholdPaginatedResponse {
  data: Household[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface GetHouseholdsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sort?: "asc" | "desc";
}

const DEFAULT_HOUSEHOLDS_SORT: Required<
  Pick<GetHouseholdsParams, "sortBy" | "sort">
> = {
  sortBy: "createdAt",
  sort: "desc",
};

type HouseholdUpdatePayload = Partial<
  Pick<Household, "name" | "settings" | "status" | "isActive">
>;

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

function toUrl(pathname: string, params?: GetHouseholdsParams): string {
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

async function getAuthContext(): Promise<{ token: string; userId?: string }> {
  const session = await auth();
  const token =
    session?.accessToken ??
    (session?.user as { accessToken?: string } | undefined)?.accessToken ??
    undefined;

  if (!token) {
    throw new Error("Missing authentication token. Please sign in again.");
  }

  return {
    token,
    userId: session?.user?.id,
  };
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
  params?: GetHouseholdsParams,
): Promise<T> {
  const { token } = await getAuthContext();
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

function normalizeHousehold(item: unknown): Household {
  const asRecord =
    item && typeof item === "object" ? (item as Record<string, unknown>) : null;

  return {
    id: typeof asRecord?.id === "string" ? asRecord.id : "",
    name:
      typeof asRecord?.name === "string" ? asRecord.name : "Unnamed household",
    settings: (asRecord?.settings as HouseholdSettings | undefined) ?? null,
    members: Array.isArray(asRecord?.members)
      ? (asRecord?.members as HouseholdMember[])
      : undefined,
    createdBy:
      (asRecord?.createdBy as string | HouseholdMember | undefined) ?? null,
    status: (asRecord?.status as string | undefined) ?? null,
    isActive:
      typeof asRecord?.isActive === "boolean" ? asRecord.isActive : null,
    deletedAt:
      typeof asRecord?.deletedAt === "string" ? asRecord.deletedAt : null,
    createdAt:
      typeof asRecord?.createdAt === "string" ? asRecord.createdAt : null,
    updatedAt:
      typeof asRecord?.updatedAt === "string" ? asRecord.updatedAt : null,
  };
}

function normalizePaginatedResponse(
  payload: unknown,
): HouseholdPaginatedResponse {
  if (Array.isArray(payload)) {
    return {
      data: payload.map(normalizeHousehold),
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
    data: items.map(normalizeHousehold),
    page,
    pageSize,
    total,
    totalPages,
  };
}

export async function getHouseholds(
  params?: GetHouseholdsParams,
): Promise<HouseholdPaginatedResponse> {
  const resolvedParams: GetHouseholdsParams = {
    ...DEFAULT_HOUSEHOLDS_SORT,
    ...(params ?? {}),
  };

  if (!resolvedParams.sortBy) {
    resolvedParams.sortBy = DEFAULT_HOUSEHOLDS_SORT.sortBy;
  }

  if (!resolvedParams.sort) {
    resolvedParams.sort = DEFAULT_HOUSEHOLDS_SORT.sort;
  }

  const payload = await authedFetch<unknown>(
    "/households",
    { method: "GET" },
    resolvedParams,
  );
  return normalizePaginatedResponse(payload);
}

export async function createHousehold(
  payload: CreateHouseholdPayload,
): Promise<Household> {
  const response = await authedFetch<unknown>("/households", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return normalizeHousehold(response);
}

export async function getHouseholdById(id: string): Promise<Household> {
  const response = await authedFetch<unknown>(`/households/${id}`, {
    method: "GET",
  });

  return normalizeHousehold(response);
}

export async function updateHousehold(
  id: string,
  payload: HouseholdUpdatePayload,
): Promise<Household> {
  const response = await authedFetch<unknown>(`/households/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return normalizeHousehold(response);
}

export async function deleteHousehold(id: string): Promise<void> {
  await authedFetch<void>(`/households/${id}`, {
    method: "DELETE",
  });
}

export async function getCurrentUserId(): Promise<string | undefined> {
  const { userId } = await getAuthContext();
  return userId;
}
