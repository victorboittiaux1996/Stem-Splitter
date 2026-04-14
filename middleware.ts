import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              domain: process.env.NODE_ENV === "production" ? ".44stems.com" : undefined,
            })
          );
        },
      },
    }
  );

  // Refresh session — MUST be called to keep auth cookies fresh
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require auth
  const publicPaths = ["/", "/login", "/pricing", "/auth/callback", "/website-", "/v5-", "/v6", "/v7", "/speed-compare"];
  const isPublic = publicPaths.some((p) =>
    p === "/" ? request.nextUrl.pathname === "/" : request.nextUrl.pathname.startsWith(p)
  );

  // Allow webhook callbacks (Modal worker + Polar payment webhooks)
  const isWebhook =
    (request.nextUrl.pathname.startsWith("/api/jobs/") && request.method === "PATCH") ||
    (request.nextUrl.pathname.startsWith("/api/webhooks/") && request.method === "POST");

  // Dev bypass — skip auth on localhost
  const isDev = request.nextUrl.hostname === "localhost" || request.nextUrl.hostname === "127.0.0.1";

  if (!user && !isPublic && !isWebhook && !isDev) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf|woff2?|otf)$).*)",
  ],
};
