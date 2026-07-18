import { auth } from "@/auth";

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionDto {
  endpoint: string;
  expirationTime: number | null;
  keys: PushSubscriptionKeys;
}

export interface SendTestNotificationPayload {
  title: string;
  body: string;
  url: string;
}

export interface NotificationTestCounts {
  sent: number;
  failed: number;
  removed: number;
  subscriptions: number;
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

  function fromMessage(value: unknown): string | null {
    if (typeof value === "string" && value.trim().length > 0) {
      return `${value} (HTTP ${response.status})`;
    }

    if (Array.isArray(value)) {
      const messages = value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      if (messages.length > 0) {
        return `${messages.join("; ")} (HTTP ${response.status})`;
      }
    }

    return null;
  }

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

    const topLevelMessage = fromMessage(asRecord?.message);
    if (topLevelMessage) {
      return topLevelMessage;
    }

    const nestedMessage = fromMessage(dataRecord?.message);
    if (nestedMessage) {
      return nestedMessage;
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

async function publicFetch<T>(pathname: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set("Accept", "application/json");

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

function normalizePublicKey(payload: unknown): string {
  const asRecord =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;
  const dataRecord =
    asRecord && asRecord.data && typeof asRecord.data === "object"
      ? (asRecord.data as Record<string, unknown>)
      : null;
  const publicKey =
    (typeof asRecord?.publicKey === "string" && asRecord.publicKey) ||
    (typeof dataRecord?.publicKey === "string" && dataRecord.publicKey) ||
    null;

  if (!publicKey) {
    throw new Error("Notifications public key is missing in the API response.");
  }

  return publicKey;
}

function assertNonEmpty(value: string, label: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }
}

function readCountValue(source: Record<string, unknown>, key: string): number {
  const value = source[key];

  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return 0;
}

function normalizeNotificationTestCounts(
  payload: unknown,
): NotificationTestCounts {
  const asRecord =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;
  const dataRecord =
    asRecord && asRecord.data && typeof asRecord.data === "object"
      ? (asRecord.data as Record<string, unknown>)
      : null;
  const source = dataRecord ?? asRecord ?? {};

  return {
    sent: readCountValue(source, "sent"),
    failed: readCountValue(source, "failed"),
    removed: readCountValue(source, "removed"),
    subscriptions: readCountValue(source, "subscriptions"),
  };
}

export async function getNotificationsPublicKey(): Promise<string> {
  const response = await publicFetch<unknown>("/notifications/public-key", {
    method: "GET",
  });

  return normalizePublicKey(response);
}

export async function subscribeToNotifications(
  payload: PushSubscriptionDto,
): Promise<void> {
  assertNonEmpty(payload.endpoint, "Subscription endpoint");

  await authedFetch<void>("/notifications/subscribe", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function unsubscribeFromNotifications(
  endpoint: string,
): Promise<void> {
  assertNonEmpty(endpoint, "Subscription endpoint");

  await authedFetch<void>("/notifications/unsubscribe", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}

export async function sendTestNotification(
  payload: SendTestNotificationPayload,
): Promise<NotificationTestCounts> {
  assertNonEmpty(payload.title, "Notification title");
  assertNonEmpty(payload.body, "Notification body");
  assertNonEmpty(payload.url, "Notification url");

  const response = await authedFetch<unknown>("/notifications/test", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return normalizeNotificationTestCounts(response);
}
