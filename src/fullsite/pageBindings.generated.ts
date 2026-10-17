/** Persisted fixed selector contract. Slot/section IDs are independent UUIDs and must not be regenerated. */
import bindingData from './pageBindings.generated.json';
export type GeneratedPageBinding = {
  slotId: string; label: string; kind: 'text' | 'image' | 'link'; selector: string; sectionId: string; sectionLabel: string;
  textMode?: 'plain' | 'lines'; text?: string; textLines?: string[]; textNodePath?: string; attribute?: string; sourcePath?: string; alt?: string;
  href?: string; linkLabel?: string; editableLinkLabel?: boolean; target?: 'gallery' | 'option' | 'background' | 'inline-background';
};
export const PAGE_BINDINGS: Record<string, GeneratedPageBinding[]> = bindingData as Record<string, GeneratedPageBinding[]>;
