import { getLegacyNotFoundData, renderLegacyNotFoundBody } from "../LegacyNotFound";

export default async function LegacyNotFound() {
  return renderLegacyNotFoundBody(await getLegacyNotFoundData());
}
