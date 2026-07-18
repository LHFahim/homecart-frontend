"use server";

import { z } from "zod";

import {
  getNotificationsPublicKey,
  sendTestNotification,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  type NotificationTestCounts,
  type PushSubscriptionDto,
} from "@/lib/notifications-api";

const pushSubscriptionSchema = z.object({
  endpoint: z.url("Invalid subscription endpoint."),
  expirationTime: z.number().nullable(),
  keys: z.object({
    p256dh: z.string().min(1, "Missing subscription key p256dh."),
    auth: z.string().min(1, "Missing subscription key auth."),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.url("Invalid subscription endpoint."),
});

const testNotificationSchema = z.object({
  title: z.string().trim().min(1, "Notification title is required."),
  body: z.string().trim().min(1, "Notification body is required."),
  url: z.string().trim().min(1, "Notification URL is required."),
});

export interface NotificationPublicKeyActionResult {
  publicKey?: string;
  error?: string;
}

export async function getNotificationPublicKeyAction(): Promise<NotificationPublicKeyActionResult> {
  try {
    const publicKey = await getNotificationsPublicKey();

    return { publicKey };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to load notifications public key.",
    };
  }
}

export interface SubscribeNotificationsActionResult {
  success?: string;
  error?: string;
  fieldErrors?: {
    endpoint?: string[];
    expirationTime?: string[];
    keys?: string[];
  };
}

export async function subscribeNotificationsAction(
  input: PushSubscriptionDto,
): Promise<SubscribeNotificationsActionResult> {
  const parsedInput = pushSubscriptionSchema.safeParse(input);

  if (!parsedInput.success) {
    const fieldErrors = parsedInput.error.flatten().fieldErrors;

    return {
      error: "Please fix the push subscription payload and try again.",
      fieldErrors: {
        endpoint: fieldErrors.endpoint,
        expirationTime: fieldErrors.expirationTime,
        keys: fieldErrors.keys,
      },
    };
  }

  try {
    await subscribeToNotifications(parsedInput.data);

    return {
      success: "Push notifications enabled successfully.",
    };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to subscribe to push notifications.",
    };
  }
}

export interface UnsubscribeNotificationsActionResult {
  success?: string;
  error?: string;
  fieldErrors?: {
    endpoint?: string[];
  };
}

export async function unsubscribeNotificationsAction(input: {
  endpoint: string;
}): Promise<UnsubscribeNotificationsActionResult> {
  const parsedInput = unsubscribeSchema.safeParse(input);

  if (!parsedInput.success) {
    const fieldErrors = parsedInput.error.flatten().fieldErrors;

    return {
      error: "Please provide a valid subscription endpoint.",
      fieldErrors: {
        endpoint: fieldErrors.endpoint,
      },
    };
  }

  try {
    await unsubscribeFromNotifications(parsedInput.data.endpoint);

    return {
      success: "Push notifications disabled successfully.",
    };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to unsubscribe from push notifications.",
    };
  }
}

export interface SendTestNotificationActionInput {
  title: string;
  body: string;
  url: string;
}

export interface SendTestNotificationActionResult {
  success?: string;
  error?: string;
  counts?: NotificationTestCounts;
  fieldErrors?: {
    title?: string[];
    body?: string[];
    url?: string[];
  };
}

export async function sendTestNotificationAction(
  input: SendTestNotificationActionInput,
): Promise<SendTestNotificationActionResult> {
  const parsedInput = testNotificationSchema.safeParse(input);

  if (!parsedInput.success) {
    const fieldErrors = parsedInput.error.flatten().fieldErrors;

    return {
      error: "Please fix the test notification fields and try again.",
      fieldErrors: {
        title: fieldErrors.title,
        body: fieldErrors.body,
        url: fieldErrors.url,
      },
    };
  }

  try {
    const counts = await sendTestNotification(parsedInput.data);

    return {
      success: "Test notification request sent.",
      counts,
    };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to send test notification.",
    };
  }
}
