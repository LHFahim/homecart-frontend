import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

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

        const loginApiUrl = new URL(
          "/auth/login/email",
          apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`,
        ).toString();

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
          const userContainer =
            asRecord && asRecord.user && typeof asRecord.user === "object"
              ? (asRecord.user as Record<string, unknown>)
              : asRecord;

          const emailFromApi =
            typeof userContainer?.email === "string"
              ? userContainer.email
              : parsedCredentials.data.email;
          const nameFromApi =
            typeof userContainer?.name === "string"
              ? userContainer.name
              : "HomeCart User";
          const idFromApi =
            typeof userContainer?.id === "string"
              ? userContainer.id
              : emailFromApi;

          return {
            id: idFromApi,
            email: emailFromApi,
            name: nameFromApi,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
});
