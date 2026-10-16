const isVercelBuild = process.env.VERCEL === '1';
const environment = process.env.VERCEL_ENV;
const explicitTarget = process.env.VERCEL_TARGET_ENV;

if (isVercelBuild && (environment !== 'preview' || explicitTarget === 'production')) {
  process.stderr.write(
    'Refusing to build the Next + Sanity experiment on Vercel outside Preview. Verify the existing netprosourcing project and experiment/nextjs-sanity target first.\n',
  );
  process.exit(1);
}
