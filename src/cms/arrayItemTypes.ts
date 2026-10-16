export const HOME_ARRAY_ITEM_TYPES = [
  { arrayPath: 'hero.slides', itemType: 'heroSlide' },
  { arrayPath: 'collection.categories', itemType: 'homeCategory' },
  { arrayPath: 'process.steps', itemType: 'processStep' },
  { arrayPath: 'startingPoints.items', itemType: 'startingPoint' },
  { arrayPath: 'brandStory.galleryFilters', itemType: 'galleryFilter' },
  { arrayPath: 'brandStory.gallery', itemType: 'galleryItem' },
  { arrayPath: 'benefits.items', itemType: 'homeBenefit' },
  { arrayPath: 'faq.items', itemType: 'homeFaqItem' },
  { arrayPath: 'footer.socialLinks', itemType: 'socialLink' },
  { arrayPath: 'footer.columns', itemType: 'footerColumn' },
  { arrayPath: 'footer.columns[].links', itemType: 'footerLink' },
] as const;

export type ArrayItemTypeRepair = {
  documentId: string;
  arrayPath: string;
  itemKey: string;
  expectedType: string;
  patchPath: string;
};

type AnyRecord = Record<string, unknown>;
const keyPattern = /^[A-Za-z0-9_-]{6,64}$/;

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function locateArrayItems(document: unknown, arrayPath: string): Array<{ item: AnyRecord; selectors: string[] }> {
  const tokens = arrayPath.split('.');
  const found: Array<{ item: AnyRecord; selectors: string[] }> = [];

  const descend = (current: unknown, index: number, selectors: string[]) => {
    if (index === tokens.length) {
      if (!Array.isArray(current)) throw new Error(`${arrayPath} is not an array in the homepage document.`);
      for (const item of current) {
        if (!isRecord(item)) throw new Error(`${arrayPath} contains a non-object item.`);
        if (typeof item._key !== 'string' || !keyPattern.test(item._key)) {
          throw new Error(`${arrayPath} contains an item without a safe, stable _key.`);
        }
        const parent = [...selectors];
        const arrayProperty = parent.pop();
        if (!arrayProperty) throw new Error(`${arrayPath} has no patchable array path.`);
        found.push({ item, selectors: [...parent, `${arrayProperty}[_key=="${item._key}"]`] });
      }
      return;
    }

    const token = tokens[index];
    const expandsArray = token.endsWith('[]');
    const fieldName = expandsArray ? token.slice(0, -2) : token;
    if (!isRecord(current) || !(fieldName in current)) {
      throw new Error(`${arrayPath} cannot be resolved at ${fieldName}.`);
    }
    const value = current[fieldName];

    if (expandsArray) {
      if (!Array.isArray(value)) throw new Error(`${fieldName} in ${arrayPath} is not an array.`);
      for (const row of value) {
        if (!isRecord(row)) throw new Error(`${fieldName} in ${arrayPath} contains a non-object item.`);
        if (typeof row._key !== 'string' || !keyPattern.test(row._key)) {
          throw new Error(`${fieldName} in ${arrayPath} contains an item without a safe, stable _key.`);
        }
        descend(row, index + 1, [...selectors, `${fieldName}[_key=="${row._key}"]`]);
      }
      return;
    }

    descend(value, index + 1, [...selectors, fieldName]);
  };

  descend(document, 0, []);
  return found;
}

export function findMissingArrayItemTypes(
  document: unknown,
  documentId: string,
): ArrayItemTypeRepair[] {
  const repairs: ArrayItemTypeRepair[] = [];
  for (const { arrayPath, itemType } of HOME_ARRAY_ITEM_TYPES) {
    for (const { item, selectors } of locateArrayItems(document, arrayPath)) {
      if (item._type == null) {
        repairs.push({
          documentId,
          arrayPath,
          itemKey: String(item._key),
          expectedType: itemType,
          patchPath: `${selectors.join('.') }._type`,
        });
      } else if (item._type !== itemType) {
        throw new Error(`${arrayPath} item ${String(item._key)} has unexpected _type ${String(item._type)}; expected ${itemType}.`);
      }
    }
  }
  return repairs;
}

/** Adds schema member types to an in-memory seed document without touching identity or content. */
export function addArrayItemTypesToSeed<T>(document: T): T {
  const copy = structuredClone(document);
  for (const { arrayPath, itemType } of HOME_ARRAY_ITEM_TYPES) {
    for (const { item } of locateArrayItems(copy, arrayPath)) {
      if (item._type == null) item._type = itemType;
      else if (item._type !== itemType) {
        throw new Error(`${arrayPath} item ${String(item._key)} has unexpected _type ${String(item._type)}; expected ${itemType}.`);
      }
    }
  }
  return copy;
}
