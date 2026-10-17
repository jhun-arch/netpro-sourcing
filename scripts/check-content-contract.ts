import { checkHomePageContract } from '../src/cms/contracts';
import { checkCatalogContract } from '../src/catalog/contracts';
import { checkFullsiteContract } from '../src/fullsite/contracts';

const errors = [...checkHomePageContract(), ...checkCatalogContract(), ...checkFullsiteContract()];
if (errors.length > 0) {
  console.error('CMS content contract failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Homepage, full-site, and catalog CMS contracts passed: renderer fields exist in schema and queries retain the required content.');
}
