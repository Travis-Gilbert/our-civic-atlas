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

console.log('2. porchfestflint.com host path table is present');
const middleware = read('src/middleware.ts');
check('porchfestflint.com host enabled', middleware.includes('"porchfestflint.com"'));
check('www.porchfestflint.com host enabled', middleware.includes('"www.porchfestflint.com"'));
for (const [sourcePath, targetPath] of HOST_REWRITE_EXPECTATIONS) {
  check(`${sourcePath} rewrites to ${targetPath}`, middleware.includes(`[${sourcePath}, ${targetPath}]`));
}

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
check('sponsor form endpoint is env-driven', sponsorForm.includes('NEXT_PUBLIC_PORCHFEST_SPONSOR_FORMSPREE_URL'));
check('sponsor form placeholder endpoint removed', !sponsorForm.includes('REPLACE_WITH_ACTUAL_ID'));

const videoBackground = read('src/components/porchfest-site/components/VideoBackground.tsx');
check('missing webm source is not requested', !videoBackground.includes('porchfest-highlights.webm'));
check('mp4 video path remains deploy-asset compatible', videoBackground.includes('/video/porchfest-highlights.mp4'));

console.log('validate-porchfest-domain-routing: all checks passed');
