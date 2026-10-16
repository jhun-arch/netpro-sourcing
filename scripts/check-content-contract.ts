import { checkHomePageContract } from '../src/cms/contracts';

const errors = checkHomePageContract();
if (errors.length > 0) {
  console.error('Homepage CMS contract failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Homepage CMS contract passed: renderer bindings exist in the nested schema and query returns the full singleton.');
}
