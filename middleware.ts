import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, isDemoModeAllowed, isSupabaseConfigured } from "@/lib/env";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function middleware(request: NextRequest) {
  const publicRoutes = ["/login", "/auth/callback", "/redefinir-senha"];
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname);

  if (!isSupabaseConfigured()) {
    if (isDemoModeAllowed()) {
      return NextResponse.next({ request });
    }

    if (isPublicRoute) {
      return NextResponse.next({ request });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("erro", "config");
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDashboardRoute = !isPublicRoute;
  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
