import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedRedirectTo = requestUrl.searchParams.get("redirectTo");
  const redirectTo =
    requestedRedirectTo?.startsWith("/") && !requestedRedirectTo.startsWith("//")
      ? requestedRedirectTo
      : "/dashboard";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}
