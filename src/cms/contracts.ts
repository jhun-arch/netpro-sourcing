import { HOME_PAGE_RENDER_BINDINGS } from '../components/homeRenderBindings';
import { homePageQuery } from './query';
import { homeCta } from '../sanity/schemaTypes/homeCta';
import { homePage } from '../sanity/schemaTypes/homePage';

type SchemaNode = {
  name?: string;
  type?: string;
  fields?: readonly SchemaNode[];
  of?: readonly SchemaNode[];
};

export type HomeContractInput = {
  schemaType?: SchemaNode;
  namedTypes?: readonly SchemaNode[];
  rendererBindings?: readonly string[];
  query?: string;
};

function isProjectionFreeSingletonQuery(query: string): boolean {
  const normalized = query.trim();
  return /^\*\[[\s\S]+\]\[0\]$/.test(normalized) && !normalized.includes(']{');
}

/** Collects nested Sanity fields using the same `[]` notation as GROQ paths. */
export function collectSchemaPaths(
  rootType: SchemaNode,
  namedTypes: readonly SchemaNode[] = [],
): Set<string> {
  const paths = new Set<string>();
  const typeByName = new Map(namedTypes.filter((type) => type.name).map((type) => [type.name!, type]));
  const activeNamedTypes = new Set<string>();

  const visitFields = (fields: readonly SchemaNode[] | undefined, prefix: string) => {
    for (const field of fields ?? []) {
      if (!field.name) continue;
      const path = prefix ? `${prefix}.${field.name}` : field.name;
      paths.add(path);

      if (field.type === 'array') {
        for (const member of field.of ?? []) {
          const rowPath = `${path}[]`;
          if (member.type === 'object' || member.fields) {
            paths.add(`${rowPath}._key`);
            paths.add(`${rowPath}._type`);
            visitFields(member.fields, rowPath);
          } else {
            paths.add(rowPath);
          }
          if (member.type && member.type !== 'object') {
            visitNamedType(member.type, rowPath);
          }
        }
        continue;
      }

      if (field.type === 'object' || field.fields) {
        visitFields(field.fields, path);
      } else if (field.type) {
        visitNamedType(field.type, path);
      }
    }
  };

  const visitNamedType = (name: string, prefix: string) => {
    const named = typeByName.get(name);
    if (!named || activeNamedTypes.has(name)) return;
    activeNamedTypes.add(name);
    visitFields(named.fields, prefix);
    activeNamedTypes.delete(name);
  };

  visitFields(rootType.fields, '');
  return paths;
}

export function checkHomePageContract(input: HomeContractInput = {}): string[] {
  const schemaPaths = collectSchemaPaths(input.schemaType ?? homePage, input.namedTypes ?? [homeCta]);
  const bindings = input.rendererBindings ?? HOME_PAGE_RENDER_BINDINGS;
  const query = input.query ?? homePageQuery;
  const errors: string[] = [];

  for (const binding of bindings) {
    if (!schemaPaths.has(binding)) {
      errors.push(`Renderer reads field missing from nested schema: ${binding}`);
    }
  }

  if (!isProjectionFreeSingletonQuery(query)) {
    errors.push('Homepage query must return the full singleton document without a field projection.');
  }

  return errors;
}

export function assertStableArrayIdentity(
  rows: readonly { _key?: string; slug?: string }[],
  label: string,
): void {
  const keys = new Set<string>();
  const slugs = new Set<string>();
  for (const [index, row] of rows.entries()) {
    if (!row._key || !/^[A-Za-z0-9_-]{6,64}$/.test(row._key)) {
      throw new Error(`${label}[${index}] has no valid persisted _key`);
    }
    if (!row.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)) {
      throw new Error(`${label}[${index}] has no stable slug`);
    }
    if (keys.has(row._key)) throw new Error(`${label} has duplicate _key: ${row._key}`);
    if (slugs.has(row.slug)) throw new Error(`${label} has duplicate slug: ${row.slug}`);
    keys.add(row._key);
    slugs.add(row.slug);
  }
}

export function preserveContentIdentity<T extends { _key: string; slug: string }>(rows: readonly T[]): T[] {
  return rows.map((row) => ({ ...row }));
}
