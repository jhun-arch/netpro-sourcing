import type { Metadata } from "next";
import HomePage from "../../src/components/HomePage";
import { getHomeMetadata } from "../../src/cms/home";

export async function generateMetadata(): Promise<Metadata> {
  return getHomeMetadata();
}

export default function Page() {
  return <HomePage />;
}
