import { renderLegacyPageBody } from "../../../src/fullsite/templateRenderer";

export default function LegacyNotFound() {
  return renderLegacyPageBody("404", null, null, false);
}