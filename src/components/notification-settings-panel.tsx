"use client";

import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationsStatus,
  sendPushNotificationsTest,
  type PushNotificationTestCounts,
  type PushNotificationsState,
} from "@/lib/push-notifications";

type UiStatus =
  | "checking"
  | "unsupported"
  | "permission-denied"
  | "disabled"
  | "enabled";

function statusLabel(status: UiStatus): string {
  switch (status) {
    case "checking":
      return "Checking";
    case "unsupported":
      return "Unsupported";
    case "permission-denied":
      return "Blocked by browser";
    case "disabled":
      return "Disabled";
    case "enabled":
      return "Enabled";
    default:
      return "Checking";
  }
}

function getStatusTone(status: UiStatus): string {
  if (status === "enabled") {
    return "border-[#cde9df] bg-[#f2fcf7] text-[#2f5f54]";
  }

  if (status === "permission-denied" || status === "unsupported") {
    return "border-[#efb8c8] bg-[#fff2f7] text-[#953f63]";
  }

  return "border-[#dce7ef] bg-[#f1f8ff] text-[#416d8a]";
}

function toUiStatus(value: PushNotificationsState["status"]): UiStatus {
  if (value === "permission-denied") {
    return "permission-denied";
  }

  return value;
}

function formatTestCounts(counts: PushNotificationTestCounts): string {
  return `Sent: ${counts.sent} | Failed: ${counts.failed} | Removed: ${counts.removed} | Subscriptions: ${counts.subscriptions}`;
}

export function NotificationSettingsPanel() {
  const [status, setStatus] = useState<UiStatus>("checking");
  const [statusBusy, setStatusBusy] = useState(true);
  const [enablePending, setEnablePending] = useState(false);
  const [disablePending, setDisablePending] = useState(false);
  const [testPending, setTestPending] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const anyPending = enablePending || disablePending || testPending;

  const statusDescription = useMemo(() => {
    if (status === "checking") {
      return "Checking browser notification support and current subscription.";
    }

    if (status === "unsupported") {
      return "This browser does not support push notifications for HomeCart.";
    }

    if (status === "permission-denied") {
      return "Notifications are blocked in this browser. Enable notifications in browser site settings and try again.";
    }

    if (status === "disabled") {
      return "Notifications are available but currently disabled for this browser.";
    }

    return "Notifications are enabled for this browser.";
  }, [status]);

  async function refreshStatus(showBusy = false) {
    if (showBusy) {
      setStatusBusy(true);
    }

    try {
      const currentStatus = await getPushNotificationsStatus();
      setStatus(toUiStatus(currentStatus.status));
    } catch (error: unknown) {
      setStatus("unsupported");
      setFeedbackError(
        error instanceof Error
          ? error.message
          : "Unable to determine notification status.",
      );
    } finally {
      if (showBusy) {
        setStatusBusy(false);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;

    const loadInitialStatus = async () => {
      try {
        const currentStatus = await getPushNotificationsStatus();

        if (cancelled) {
          return;
        }

        setStatus(toUiStatus(currentStatus.status));
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        setStatus("unsupported");
        setFeedbackError(
          error instanceof Error
            ? error.message
            : "Unable to determine notification status.",
        );
      } finally {
        if (!cancelled) {
          setStatusBusy(false);
        }
      }
    };

    void loadInitialStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    if (enablePending) {
      return;
    }

    setFeedbackError(null);
    setFeedbackSuccess(null);
    setEnablePending(true);

    try {
      await enablePushNotifications();
      setFeedbackSuccess("Notifications enabled successfully.");
      await refreshStatus(true);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to enable notifications right now.";
      setFeedbackError(message);

      if (message.toLowerCase().includes("blocked")) {
        setStatus("permission-denied");
      }
    } finally {
      setEnablePending(false);
    }
  }

  async function handleDisable() {
    if (disablePending) {
      return;
    }

    setFeedbackError(null);
    setFeedbackSuccess(null);
    setDisablePending(true);

    try {
      const disabled = await disablePushNotifications();

      if (disabled) {
        setFeedbackSuccess("Notifications disabled successfully.");
      } else {
        setFeedbackSuccess("Notifications were already disabled.");
      }

      await refreshStatus(true);
    } catch (error: unknown) {
      setFeedbackError(
        error instanceof Error
          ? error.message
          : "Unable to disable notifications right now.",
      );
    } finally {
      setDisablePending(false);
    }
  }

  async function handleSendTest() {
    if (testPending) {
      return;
    }

    setFeedbackError(null);
    setFeedbackSuccess(null);
    setTestPending(true);

    try {
      const counts = await sendPushNotificationsTest();
      const summary = formatTestCounts(counts);

      if (counts.sent === 0) {
        setFeedbackError(
          `No notifications were sent. ${summary}. Check if this browser is currently subscribed.`,
        );
      } else {
        setFeedbackSuccess(`Test notification requested. ${summary}.`);
      }

      await refreshStatus(true);
    } catch (error: unknown) {
      setFeedbackError(
        error instanceof Error
          ? error.message
          : "Unable to send test notification right now.",
      );
    } finally {
      setTestPending(false);
    }
  }

  return (
    <Card className="card-lift rounded-4xl border border-[#d8e9ef] bg-[linear-gradient(150deg,#f8fdff,#f3fff9)] py-0 shadow-[0_14px_30px_rgba(126,176,194,0.16)] animate-rise-in">
      <CardHeader className="gap-2 px-6 pt-6 pb-0 sm:px-7 sm:pt-7">
        <CardTitle className="inline-flex items-center gap-2 font-heading text-2xl font-semibold text-[#2f3550]">
          <Bell className="size-5 text-[#4c9ab0]" />
          Browser Notifications
        </CardTitle>
        <CardDescription className="text-sm text-[#5f667f]">
          Control push notifications for this browser and test delivery.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 px-6 py-6 sm:px-7">
        <div className="rounded-2xl border border-[#dce7ef] bg-white/75 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8492a6]">
            Current Status
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getStatusTone(status)}`}
              aria-live="polite"
            >
              {statusBusy ? "Checking" : statusLabel(status)}
            </span>
            {statusBusy && (
              <Loader2 className="size-4 animate-spin text-[#4c9ab0]" />
            )}
          </div>
          <p
            className="mt-2 text-sm text-[#5f667f]"
            role="status"
            aria-live="polite"
          >
            {statusDescription}
          </p>
        </div>

        {feedbackSuccess && (
          <p
            className="rounded-2xl border border-[#bde0d8] bg-[#edfdf9] px-3 py-2 text-sm text-[#2a6c67]"
            role="status"
            aria-live="polite"
          >
            {feedbackSuccess}
          </p>
        )}

        {feedbackError && (
          <p
            className="rounded-2xl border border-[#efb8c8] bg-[#fff2f7] p-3 text-sm text-[#953f63]"
            role="alert"
          >
            {feedbackError}
          </p>
        )}

        {(status === "disabled" || status === "permission-denied") && (
          <Button
            type="button"
            onClick={() => void handleEnable()}
            disabled={
              statusBusy || anyPending || status === "permission-denied"
            }
            className="h-11 rounded-3xl border-0 bg-[linear-gradient(120deg,#ffd1e2,#ffc6b8)] px-6 font-semibold text-[#5f2f4f] shadow-[0_10px_22px_rgba(214,130,173,0.24)] hover:brightness-105"
            aria-label="Enable browser notifications"
          >
            {enablePending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Enabling...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Bell className="size-4" />
                Enable notifications
              </span>
            )}
          </Button>
        )}

        {status === "enabled" && (
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => void handleSendTest()}
              disabled={statusBusy || anyPending}
              className="h-11 rounded-3xl border-0 bg-[linear-gradient(120deg,#d8f3ff,#e9f6ef)] px-5 font-semibold text-[#2f5466] shadow-[0_6px_14px_rgba(128,183,203,0.2)] hover:brightness-105"
              aria-label="Send test push notification"
            >
              {testPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Sending test...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Send className="size-4" />
                  Send test notification
                </span>
              )}
            </Button>

            <Button
              type="button"
              onClick={() => void handleDisable()}
              disabled={statusBusy || anyPending}
              variant="outline"
              className="h-11 rounded-3xl border-[#e8cfe5] bg-white px-5 font-semibold text-[#5f2f4f]"
              aria-label="Disable browser notifications"
            >
              {disablePending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Disabling...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <BellOff className="size-4" />
                  Disable notifications
                </span>
              )}
            </Button>
          </div>
        )}

        {status === "unsupported" && (
          <p
            className="text-sm text-[#5f667f]"
            role="status"
            aria-live="polite"
          >
            Push notifications are not available in this browser.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
