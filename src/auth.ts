import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

function getStringField(
  source: Record<string, unknown> | null,
  keys: string[],
): string | null {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

function toApiUrl(baseUrl: string, path: string): string {
  return new URL(
    path.replace(/^\//, ""),
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  ).toString();
}

const credentialsSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(72),
});

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth,
} = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsedCredentials = credentialsSchema.safeParse(rawCredentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const apiBaseUrl = process.env.AUTH_API_BASE_URL;

        if (!apiBaseUrl) {
          return null;
        }

        const loginApiUrl = toApiUrl(apiBaseUrl, "auth/login/email");

        try {
          const response = await fetch(loginApiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: parsedCredentials.data.email,
              password: parsedCredentials.data.password,
            }),
          });

          if (!response.ok) {
            return null;
          }

          const payload: unknown = await response.json();
          const asRecord =
            payload && typeof payload === "object"
              ? (payload as Record<string, unknown>)
              : null;
          const dataContainer =
            asRecord && asRecord.data && typeof asRecord.data === "object"
              ? (asRecord.data as Record<string, unknown>)
              : null;
          const tokenContainer =
            dataContainer &&
            dataContainer.token &&
            typeof dataContainer.token === "object"
              ? (dataContainer.token as Record<string, unknown>)
              : null;
          const tokensContainer =
            dataContainer &&
            dataContainer.tokens &&
            typeof dataContainer.tokens === "object"
              ? (dataContainer.tokens as Record<string, unknown>)
              : null;
          const userContainer =
            asRecord && asRecord.user && typeof asRecord.user === "object"
              ? (asRecord.user as Record<string, unknown>)
              : dataContainer &&
                  dataContainer.user &&
                  typeof dataContainer.user === "object"
                ? (dataContainer.user as Record<string, unknown>)
                : asRecord;

          const accessTokenFromApi =
            getStringField(asRecord, ["accessToken", "access_token", "jwt"]) ??
            getStringField(dataContainer, [
              "accessToken",
              "access_token",
              "jwt",
            ]) ??
            getStringField(tokensContainer, [
              "accessToken",
              "access_token",
              "jwt",
              "access",
            ]) ??
            getStringField(tokenContainer, [
              "accessToken",
              "access_token",
              "jwt",
            ]) ??
            getStringField(asRecord, ["token"]) ??
            getStringField(dataContainer, ["token"]);

          if (!accessTokenFromApi) {
            return null;
          }

          const emailFromApi =
            typeof userContainer?.email === "string"
              ? userContainer.email
              : parsedCredentials.data.email;
          const nameFromApi =
            typeof userContainer?.name === "string"
              ? userContainer.name
              : "HomeCart User";
          const idFromApi =
            getStringField(userContainer, ["id", "userId", "_id", "sub"]) ??
            emailFromApi;

          return {
            id: idFromApi,
            email: emailFromApi,
            name: nameFromApi,
            accessToken: accessTokenFromApi,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        if (typeof user.id === "string") {
          token.userId = user.id;
        }

        if (typeof user.accessToken === "string") {
          token.accessToken = user.accessToken;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }

      if (typeof token.accessToken === "string") {
        session.accessToken = token.accessToken;
      }

      return session;
    },
  },
});
