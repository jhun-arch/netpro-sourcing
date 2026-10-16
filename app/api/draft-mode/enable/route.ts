import { defineEnableDraftMode } from "next-sanity/draft-mode";
import { getSanityClient } from "@/src/cms/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = (response: Response) => {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
};

export async function GET(request: Request) {
  const client = (() => {
    try {
      return getSanityClient(true);
    } catch {
      return null;
    }
  })();

  if (!client) {
    return noStore(new Response("Draft preview is not configured.", { status: 503 }));
  }

  const { GET: enableDraftMode } = defineEnableDraftMode({ client });
  const response = await enableDraftMode(request);
  return noStore(response);
}
