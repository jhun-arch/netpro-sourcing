import { draftMode } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  (await draftMode()).disable();

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
