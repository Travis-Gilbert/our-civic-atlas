import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const REQUIRED_FILES = [
  'src/app/porchfest-public/page.tsx',
  'src/app/porchfest-public/sponsors/page.tsx',
  'src/app/porchfest-public/board/page.tsx',
  'src/app/porchfest/apply/page.tsx',
  'src/app/porchfest/workspace/page.tsx',
  'src/app/porchfest/page.tsx',
  'public/photos/poster-hero.jpg',
  'src/components/porchfest-site/PorchfestPublicShell.tsx',
];

const HOST_REWRITE_EXPECTATIONS = [
  ['"/"', '"/porchfest-public"'],
  ['"/apply"', '"/porchfest/apply"'],
  ['"/sponsors"', '"/porchfest-public/sponsors"'],
  ['"/board"', '"/porchfest-public/board"'],
  ['"/planning"', '"/porchfest"'],
  ['"/workspace"', '"/porchfest/workspace"'],
];

const FLINT_ATLAS_CLEAN_PATH_EXPECTATIONS = [
  '"/contribute"',
  '"/lost-flint"',
  '"/methodology"',
  '"/node"',
  '"/object"',
  '"/place"',
  '"/scene"',
  '"/sources"',
];

const FLINT_ATLAS_REDIRECT_EXPECTATIONS = [
  ['"/planning"', '"/planning"'],
  ['"/apply"', '"/apply"'],
  ['"/workspace"', '"/workspace"'],
  ['"/sponsors"', '"/sponsors"'],
  ['"/board"', '"/board"'],
  ['"/dashboard"', '"/dashboard"'],
  ['"/porchfest"', '"/planning"'],
  ['"/porchfest/"', '"/planning"'],
  ['"/porchfest/apply"', '"/apply"'],
  ['"/porchfest/workspace"', '"/workspace"'],
  ['"/porchfest/dashboard"', '"/dashboard"'],
  ['"/porchfest-public"', '"/"'],
  ['"/porchfest-public/sponsors"', '"/sponsors"'],
  ['"/porchfest-public/board"', '"/board"'],
];

function check(label, condition, detail = '') {
  if (!condition) {
    throw new Error(`${label}${detail ? `: ${detail}` : ''}`);
  }
  console.log(`ok  ${label}`);
}

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

console.log('1. required PorchFest public routes and assets exist');
for (const relativePath of REQUIRED_FILES) {
  check(relativePath, existsSync(path.join(ROOT, relativePath)));
}

console.log('2. host split path tables are present');
const middleware = read('src/middleware.ts');
check('porchfestflint.com host enabled', middleware.includes('"porchfestflint.com"'));
check('www.porchfestflint.com host enabled', middleware.includes('"www.porchfestflint.com"'));
check('flint.ourcivicatlas.org host enabled', middleware.includes('"flint.ourcivicatlas.org"'));
check(
  'flint.ourcivicatlas.org root rewrites to the atlas route',
  middleware.includes('if (pathname === "/") return "/open-flint-atlas"'),
);
for (const cleanPath of FLINT_ATLAS_CLEAN_PATH_EXPECTATIONS) {
  check(`flint.ourcivicatlas.org clean Atlas path ${cleanPath} is recognized`, middleware.includes(cleanPath));
}
check(
  'clean Atlas paths rewrite under /open-flint-atlas',
  middleware.includes('return `/open-flint-atlas${pathname}`'),
);
for (const [sourcePath, targetPath] of HOST_REWRITE_EXPECTATIONS) {
  check(`porchfestflint.com ${sourcePath} rewrites to ${targetPath}`, middleware.includes(`[${sourcePath}, ${targetPath}]`));
}
for (const [sourcePath, targetPath] of FLINT_ATLAS_REDIRECT_EXPECTATIONS) {
  check(
    `flint.ourcivicatlas.org ${sourcePath} redirects to porchfestflint.com${targetPath}`,
    middleware.includes(`[${sourcePath}, ${targetPath}]`),
  );
}
check(
  'flint.ourcivicatlas.org PorchFest redirects preserve query string',
  middleware.includes('target.search = req.nextUrl.search'),
);
check(
  'flint.ourcivicatlas.org unknown /porchfest/* routes redirect to /planning',
  middleware.includes('pathname.startsWith("/porchfest/")') &&
    middleware.includes('return "/planning"'),
);
check(
  'porchfestflint.com /open-flint-atlas redirects to flint.ourcivicatlas.org root',
  middleware.includes('pathname === "/open-flint-atlas"') &&
    middleware.includes('return "/"') &&
    middleware.includes('redirectToHost(req, "flint.ourcivicatlas.org", atlasPath)'),
);
check(
  'porchfestflint.com /open-flint-atlas/* strips the old prefix on redirect',
  middleware.includes('pathname.slice("/open-flint-atlas".length)'),
);
check(
  'legacy /porchfest/workspace redirects to /workspace',
  middleware.includes('req.nextUrl.pathname === "/porchfest/workspace"') &&
    middleware.includes('target.pathname = "/workspace"') &&
    middleware.includes('NextResponse.redirect(target, 308)'),
);
check(
  'legacy /porchfest/apply redirects to clean /apply on porchfestflint.com',
  middleware.includes('req.nextUrl.pathname === "/porchfest/apply"') &&
    middleware.includes('target.pathname = "/apply"') &&
    middleware.includes('NextResponse.redirect(target, 308)'),
);

console.log('3. retired legacy dependencies stay out of the public-site island');
const publicSiteFiles = [
  'src/components/porchfest-site/components/Nav.tsx',
  'src/components/porchfest-site/components/Footer.tsx',
  'src/components/porchfest-site/sections/SponsorBar.tsx',
  'src/components/porchfest-site/sections/SponsorForm.tsx',
  'src/components/porchfest-site/sections/ApplyCTA.tsx',
  'src/components/porchfest-site/components/VideoBackground.tsx',
  'src/components/porchfest-site/board-data.ts',
].map((relativePath) => [relativePath, read(relativePath)]);

for (const [relativePath, content] of publicSiteFiles) {
  check(`${relativePath} has no react-router-dom`, !content.includes('react-router-dom'));
  check(`${relativePath} has no Stripe checkout copy`, !/stripe|checkout/i.test(content));
}

const sponsorForm = read('src/components/porchfest-site/sections/SponsorForm.tsx');
check('sponsor form submits through Civic Atlas GraphQL', sponsorForm.includes('submitEventApplication(input: $input)'));
check('sponsor form posts to the shared GraphQL endpoint', sponsorForm.includes('resolveBrowserGraphqlEndpoint'));
check('sponsor form has no Formspree endpoint', !/FORMSPREE|formspree\.io/.test(sponsorForm));

const videoBackground = read('src/components/porchfest-site/components/VideoBackground.tsx');
check('missing webm source is not requested', !videoBackground.includes('porchfest-highlights.webm'));
check('mp4 video path remains deploy-asset compatible', videoBackground.includes('/video/porchfest-highlights.mp4'));

console.log('validate-porchfest-domain-routing: all checks passed');
