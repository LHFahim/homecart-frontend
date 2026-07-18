"use client";

import {
  getNotificationPublicKeyAction,
  sendTestNotificationAction,
  subscribeNotificationsAction,
  unsubscribeNotificationsAction,
} from "@/app/households/notification-actions";

type UnknownRecord = Record<string, unknown>;

export type PushNotificationsStatus =
  | "unsupported"
  | "permission-denied"
  | "disabled"
  | "enabled";

export interface PushNotificationsState {
  status: PushNotificationsStatus;
  permission: NotificationPermission | "unsupported";
  subscription: PushSubscription | null;
}

export interface PushNotificationTestCounts {
  sent: number;
  failed: number;
  removed: number;
  subscriptions: number;
}

interface PushSubscriptionDto {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function isPushNotificationsSupported(): boolean {
  return (
    hasWindow() &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function getActionErrorMessage(value: unknown, fallback: string): string {
  if (!value) {
    return fallback;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value)) {
    const messageItems = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (messageItems.length > 0) {
      return messageItems.join("; ");
    }
  }

  if (value && typeof value === "object") {
    const asRecord = value as UnknownRecord;

    if (
      typeof asRecord.error === "string" &&
      asRecord.error.trim().length > 0
    ) {
      return asRecord.error;
    }

    if (
      typeof asRecord.message === "string" &&
      asRecord.message.trim().length > 0
    ) {
      return asRecord.message;
    }

    if (Array.isArray(asRecord.message)) {
      const messageItems = asRecord.message
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      if (messageItems.length > 0) {
        return messageItems.join("; ");
      }
    }

    if (Array.isArray(asRecord.errors)) {
      const messageItems = asRecord.errors
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          if (
            item &&
            typeof item === "object" &&
            typeof (item as UnknownRecord).message === "string"
          ) {
            return (item as UnknownRecord).message as string;
          }

          return "";
        })
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      if (messageItems.length > 0) {
        return messageItems.join("; ");
      }
    }
  }

  return fallback;
}

function assertPushNotificationsSupport(): void {
  if (!isPushNotificationsSupported()) {
    throw new Error(
      "Push notifications are not supported in this browser or context.",
    );
  }
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  const normalizedBuffer = new ArrayBuffer(outputArray.length);
  new Uint8Array(normalizedBuffer).set(outputArray);

  return normalizedBuffer;
}

function toPushSubscriptionDto(
  subscription: PushSubscription,
): PushSubscriptionDto {
  const serialized = subscription.toJSON();
  const endpoint = serialized.endpoint ?? subscription.endpoint;

  if (!endpoint || endpoint.trim().length === 0) {
    throw new Error("Push subscription endpoint is missing.");
  }

  const p256dh = serialized.keys?.p256dh;
  const auth = serialized.keys?.auth;

  if (!p256dh || !auth) {
    throw new Error(
      "Push subscription keys are missing. Please re-enable notifications.",
    );
  }

  return {
    endpoint,
    expirationTime: serialized.expirationTime ?? null,
    keys: {
      p256dh,
      auth,
    },
  };
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration> {
  assertPushNotificationsSupport();

  await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });

  return navigator.serviceWorker.ready;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  const registration = await registerPushServiceWorker();
  return registration.pushManager.getSubscription();
}

export async function enablePushNotifications(): Promise<PushSubscription> {
  assertPushNotificationsSupport();

  if (Notification.permission === "denied") {
    throw new Error(
      "Notifications are blocked for HomeCart in this browser. Please allow notifications in browser settings.",
    );
  }

  const registration = await registerPushServiceWorker();
  const existingSubscription = await registration.pushManager.getSubscription();

  const currentPermission = Notification.permission;
  if (currentPermission !== "granted") {
    const permission = await Notification.requestPermission();

    if (permission === "denied") {
      throw new Error(
        "Notifications permission was denied. Please enable it in your browser settings.",
      );
    }

    if (permission !== "granted") {
      throw new Error(
        "Notifications permission was not granted. Please try again.",
      );
    }
  }

  if (existingSubscription) {
    const subscribeResult = await subscribeNotificationsAction(
      toPushSubscriptionDto(existingSubscription),
    );

    if (subscribeResult.error) {
      throw new Error(
        getActionErrorMessage(
          subscribeResult.error,
          "Unable to enable push notifications.",
        ),
      );
    }

    return existingSubscription;
  }

  const keyResult = await getNotificationPublicKeyAction();

  if (keyResult.error) {
    throw new Error(
      getActionErrorMessage(
        keyResult.error,
        "Unable to load the notifications public key.",
      ),
    );
  }

  if (!keyResult.publicKey || keyResult.publicKey.trim().length === 0) {
    throw new Error("Notifications public key is missing.");
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToArrayBuffer(keyResult.publicKey),
  });

  const subscribeResult = await subscribeNotificationsAction(
    toPushSubscriptionDto(subscription),
  );

  if (subscribeResult.error) {
    try {
      await subscription.unsubscribe();
    } catch {
      // Ignore cleanup errors so the primary backend error is shown to the user.
    }

    throw new Error(
      getActionErrorMessage(
        subscribeResult.error,
        "Unable to enable push notifications.",
      ),
    );
  }

  return subscription;
}

export async function disablePushNotifications(): Promise<boolean> {
  assertPushNotificationsSupport();

  const registration = await registerPushServiceWorker();
  const browserSubscription = await registration.pushManager.getSubscription();

  if (!browserSubscription) {
    return false;
  }

  const unsubscribeResult = await unsubscribeNotificationsAction({
    endpoint: browserSubscription.endpoint,
  });

  if (unsubscribeResult.error) {
    throw new Error(
      getActionErrorMessage(
        unsubscribeResult.error,
        "Unable to disable push notifications.",
      ),
    );
  }

  await browserSubscription.unsubscribe();
  return true;
}

export async function sendPushNotificationsTest(): Promise<PushNotificationTestCounts> {
  const result = await sendTestNotificationAction({
    title: "HomeCart",
    body: "Browser push notifications are working!",
    url: "/",
  });

  if (result.error) {
    throw new Error(
      getActionErrorMessage(result.error, "Unable to send test notification."),
    );
  }

  return {
    sent: result.counts?.sent ?? 0,
    failed: result.counts?.failed ?? 0,
    removed: result.counts?.removed ?? 0,
    subscriptions: result.counts?.subscriptions ?? 0,
  };
}

export async function getPushNotificationsStatus(): Promise<PushNotificationsState> {
  if (!isPushNotificationsSupported()) {
    return {
      status: "unsupported",
      permission: "unsupported",
      subscription: null,
    };
  }

  if (Notification.permission === "denied") {
    return {
      status: "permission-denied",
      permission: "denied",
      subscription: null,
    };
  }

  const registration = await registerPushServiceWorker();
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    return {
      status: "enabled",
      permission: Notification.permission,
      subscription,
    };
  }

  return {
    status: "disabled",
    permission: Notification.permission,
    subscription: null,
  };
}
