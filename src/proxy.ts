import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";

export const proxy = auth((request: NextRequest & { auth: unknown }) => {
  const isLoggedIn = Boolean(request.auth);
  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

  if (isLoginRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
