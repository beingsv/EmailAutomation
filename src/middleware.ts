import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  // Protect dashboard routes - redirect to login if not authenticated
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/resume") || pathname.startsWith("/email-generator") || pathname.startsWith("/ats-scorer") || pathname.startsWith("/interview-prep") || pathname.startsWith("/settings")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users away from auth pages
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/resume/:path*",
    "/email-generator/:path*",
    "/ats-scorer/:path*",
    "/interview-prep/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
