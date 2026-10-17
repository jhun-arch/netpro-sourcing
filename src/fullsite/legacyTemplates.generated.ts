/** Controlled snapshot; refresh only with scripts/build-page-bindings.ts --refresh-templates. */
import templateData from './legacyTemplates.generated.json';
export const LEGACY_TEMPLATES: Record<string, string> = templateData;
