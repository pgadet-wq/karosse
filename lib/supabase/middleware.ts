import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Root path redirect
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/calendar" : "/login";
    return NextResponse.redirect(url);
  }

  // Protected routes under /(dashboard)/
  const dashboardPaths = ["/calendar", "/drivers", "/group", "/profile"];
  const isProtectedPath = dashboardPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from login/signup (but not onboarding or join)
  const authOnlyPaths = ["/login", "/signup", "/connexion", "/inscription"];
  const isAuthOnlyPath = authOnlyPaths.some((path) => pathname === path);

  if (isAuthOnlyPath && user) {
    // Check if user has completed onboarding (has a member profile)
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = member ? "/calendar" : "/onboarding";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
