self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function resolveNotificationUrl(rawUrl) {
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    return new URL("/", self.location.origin).toString();
  }

  try {
    return new URL(rawUrl, self.location.origin).toString();
  } catch {
    return new URL("/", self.location.origin).toString();
  }
}

function parsePushPayload(event) {
  const fallback = {
    title: "HomeCart",
    body: "You have a new HomeCart notification.",
    url: "/",
  };

  if (!event.data) {
    return fallback;
  }

  try {
    const parsed = event.data.json();

    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    try {
      const text = event.data.text();

      if (typeof text === "string" && text.trim().length > 0) {
        return {
          ...fallback,
          body: text,
        };
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event);

  const title =
    typeof payload.title === "string" && payload.title.trim().length > 0
      ? payload.title
      : "HomeCart";
  const body =
    typeof payload.body === "string" && payload.body.trim().length > 0
      ? payload.body
      : "You have a new HomeCart notification.";
  const icon =
    typeof payload.icon === "string" && payload.icon.trim().length > 0
      ? payload.icon
      : undefined;
  const badge =
    typeof payload.badge === "string" && payload.badge.trim().length > 0
      ? payload.badge
      : undefined;
  const tag =
    typeof payload.tag === "string" && payload.tag.trim().length > 0
      ? payload.tag
      : undefined;
  const targetUrl = resolveNotificationUrl(payload.url);
  const extraData =
    payload.data && typeof payload.data === "object" ? payload.data : {};

  const options = {
    body,
    icon,
    badge,
    tag,
    data: {
      ...extraData,
      url: targetUrl,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const rawUrl =
        event.notification &&
        event.notification.data &&
        typeof event.notification.data.url === "string"
          ? event.notification.data.url
          : "/";
      const targetUrl = resolveNotificationUrl(rawUrl);
      const target = new URL(targetUrl);

      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const sameOriginClient = windowClients.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      if (sameOriginClient) {
        const currentClientUrl = new URL(
          sameOriginClient.url,
          self.location.origin,
        );

        if (
          currentClientUrl.href !== target.href &&
          sameOriginClient.navigate
        ) {
          const navigatedClient = await sameOriginClient.navigate(targetUrl);

          if (navigatedClient && navigatedClient.focus) {
            await navigatedClient.focus();
            return;
          }
        }

        if (sameOriginClient.focus) {
          await sameOriginClient.focus();
          return;
        }
      }

      await self.clients.openWindow(target.toString());
    })(),
  );
});
