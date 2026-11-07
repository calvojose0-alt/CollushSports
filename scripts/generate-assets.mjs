/**
 * generate-assets.mjs
 * Generates iOS app icons (all required sizes) and a splash screen
 * from the Collush Sports SVG logo using sharp.
 *
 * Run: node scripts/generate-assets.mjs
 */
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ── SVG source — the Collush Sports CS logo (1024×1024 viewBox) ───────────────
// Scaled up 30× from the 34×34 original in Header.jsx
const ICON_SVG = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Orange rounded background -->
  <rect width="1024" height="1024" rx="220" fill="#FF8000"/>
  <!-- C (white) -->
  <path d="M301 377 C301 286 376 226 467 226 L542 226"
    stroke="white" stroke-width="66" stroke-linecap="round" fill="none"/>
  <path d="M301 377 L301 647 C301 738 376 798 467 798 L542 798"
    stroke="white" stroke-width="66" stroke-linecap="round" fill="none"/>
  <!-- S (black) -->
  <path d="M633 256 C633 256 768 241 768 346 C768 437 633 467 633 557 C633 647 768 647 768 768"
    stroke="#1a1a1a" stroke-width="66" stroke-linecap="round" fill="none"/>
</svg>`

// Splash screen SVG — dark background, CS logo centered, sports icons orbiting,
// "Loading..." text below
const SPLASH_SVG = `<svg width="2732" height="2732" viewBox="0 0 2732 2732" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Dark background -->
  <rect width="2732" height="2732" fill="#111111"/>

  <!-- ── Sport icons orbiting around logo ─────────────────────────────── -->

  <!-- Soccer ball (top-left of center) -->
  <g transform="translate(880, 1020)">
    <circle cx="0" cy="0" r="110" fill="#ffffff"/>
    <circle cx="0" cy="0" r="110" fill="none" stroke="#cccccc" stroke-width="4"/>
    <!-- Pentagon patches -->
    <polygon points="0,-62 59,-19 36,51 -36,51 -59,-19" fill="#222222"/>
    <polygon points="0,-105 30,-85 30,-42 0,-62 -30,-42 -30,-85" fill="none" stroke="#222222" stroke-width="3"/>
    <polygon points="90,-29 105,11 75,40 48,20 58,-18" fill="#222222"/>
    <polygon points="-90,-29 -105,11 -75,40 -48,20 -58,-18" fill="#222222"/>
    <polygon points="55,78 20,100 -20,100 -55,78 -36,51 36,51" fill="#222222"/>
  </g>

  <!-- American football (top-right of center) -->
  <g transform="translate(1852, 1020)">
    <!-- Ball body -->
    <ellipse cx="0" cy="0" rx="96" ry="64" fill="#8B4513" transform="rotate(-30)"/>
    <ellipse cx="0" cy="0" rx="96" ry="64" fill="none" stroke="#6B3410" stroke-width="4" transform="rotate(-30)"/>
    <!-- Laces -->
    <line x1="-10" y1="-22" x2="10" y2="22" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <line x1="-22" y1="-8" x2="22" y2="-8" stroke="white" stroke-width="4" stroke-linecap="round"/>
    <line x1="-20" y1="2" x2="20" y2="2" stroke="white" stroke-width="4" stroke-linecap="round"/>
    <line x1="-18" y1="12" x2="18" y2="12" stroke="white" stroke-width="4" stroke-linecap="round"/>
  </g>

  <!-- F1 car (bottom center, below logo) -->
  <g transform="translate(1366, 1820) scale(1.8)">
    <!-- Car body -->
    <ellipse cx="0" cy="0" rx="120" ry="28" fill="#FF0000"/>
    <!-- Cockpit -->
    <ellipse cx="10" cy="-16" rx="38" ry="20" fill="#CC0000"/>
    <ellipse cx="10" cy="-18" rx="28" ry="13" fill="#1a1a1a"/>
    <!-- Nose cone -->
    <polygon points="120,0 148,-6 148,6" fill="#CC0000"/>
    <!-- Rear wing -->
    <rect x="-130" y="-22" width="24" height="6" rx="2" fill="#CC0000"/>
    <rect x="-118" y="-36" width="2" height="14" fill="#999"/>
    <rect x="-106" y="-36" width="2" height="14" fill="#999"/>
    <!-- Front wing -->
    <rect x="118" y="8" width="36" height="5" rx="2" fill="#CC0000"/>
    <!-- Wheels -->
    <ellipse cx="-80" cy="20" rx="22" ry="22" fill="#222"/>
    <ellipse cx="-80" cy="20" rx="14" ry="14" fill="#444"/>
    <ellipse cx="80" cy="20" rx="22" ry="22" fill="#222"/>
    <ellipse cx="80" cy="20" rx="14" ry="14" fill="#444"/>
    <ellipse cx="-80" cy="-20" rx="18" ry="18" fill="#222"/>
    <ellipse cx="-80" cy="-20" rx="11" ry="11" fill="#444"/>
    <ellipse cx="80" cy="-20" rx="18" ry="18" fill="#222"/>
    <ellipse cx="80" cy="-20" rx="11" ry="11" fill="#444"/>
    <!-- Halo -->
    <path d="M-20,-28 Q10,-48 40,-28" stroke="#FFD700" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- Speed lines -->
    <line x1="-150" y1="-6" x2="-200" y2="-6" stroke="#FF8000" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
    <line x1="-150" y1="4" x2="-210" y2="4" stroke="#FF8000" stroke-width="3" stroke-linecap="round" opacity="0.4"/>
    <line x1="-150" y1="14" x2="-195" y2="14" stroke="#FF8000" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
  </g>

  <!-- ── CS Logo (center) ──────────────────────────────────────────────── -->
  <rect x="1116" y="1016" width="500" height="500" rx="112" fill="#FF8000"/>
  <!-- C (white) -->
  <path d="M1218 1185 C1218 1132 1257 1096 1304 1096 L1342 1096"
    stroke="white" stroke-width="52" stroke-linecap="round" fill="none"/>
  <path d="M1218 1185 L1218 1331 C1218 1384 1257 1420 1304 1420 L1342 1420"
    stroke="white" stroke-width="52" stroke-linecap="round" fill="none"/>
  <!-- S (dark) -->
  <path d="M1390 1104 C1390 1104 1476 1095 1476 1154 C1476 1207 1390 1226 1390 1279 C1390 1332 1476 1332 1476 1432"
    stroke="#1a1a1a" stroke-width="52" stroke-linecap="round" fill="none"/>

  <!-- ── App name ────────────────────────────────────────────────────────── -->
  <text x="1366" y="1630" font-family="Arial Black, Arial" font-weight="900" font-size="96"
    fill="white" text-anchor="middle" letter-spacing="10">COLLUSH SPORTS</text>

  <!-- ── Loading indicator ─────────────────────────────────────────────── -->
  <text x="1366" y="1720" font-family="Arial, sans-serif" font-weight="400" font-size="58"
    fill="#888888" text-anchor="middle" letter-spacing="4">Loading...</text>

  <!-- Thin orange loading bar -->
  <rect x="1166" y="1755" width="400" height="6" rx="3" fill="#333333"/>
  <rect x="1166" y="1755" width="180" height="6" rx="3" fill="#FF8000"/>
</svg>`

// ── iOS App Icon sizes required by Apple ──────────────────────────────────────
// Each entry gets a UNIQUE filename using size@scale notation to avoid overwrites.
const ICON_SIZES = [
  { size: 20,   scale: 1, idiom: 'iphone' },
  { size: 20,   scale: 2, idiom: 'iphone' },
  { size: 20,   scale: 3, idiom: 'iphone' },
  { size: 29,   scale: 1, idiom: 'iphone' },
  { size: 29,   scale: 2, idiom: 'iphone' },
  { size: 29,   scale: 3, idiom: 'iphone' },
  { size: 40,   scale: 2, idiom: 'iphone' },
  { size: 40,   scale: 3, idiom: 'iphone' },
  { size: 60,   scale: 2, idiom: 'iphone' },
  { size: 60,   scale: 3, idiom: 'iphone' },
  { size: 20,   scale: 1, idiom: 'ipad'   },
  { size: 20,   scale: 2, idiom: 'ipad'   },
  { size: 29,   scale: 1, idiom: 'ipad'   },
  { size: 29,   scale: 2, idiom: 'ipad'   },
  { size: 40,   scale: 1, idiom: 'ipad'   },
  { size: 40,   scale: 2, idiom: 'ipad'   },
  { size: 76,   scale: 1, idiom: 'ipad'   },
  { size: 76,   scale: 2, idiom: 'ipad'   },
  { size: 83.5, scale: 2, idiom: 'ipad'   },
  { size: 1024, scale: 1, idiom: 'ios-marketing' },
]

// ── Output paths ──────────────────────────────────────────────────────────────
const ICON_DIR   = path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset')
const SPLASH_DIR = path.join(ROOT, 'ios/App/App/Assets.xcassets/Splash.imageset')

fs.mkdirSync(ICON_DIR,   { recursive: true })
fs.mkdirSync(SPLASH_DIR, { recursive: true })

// ── Generate icons ────────────────────────────────────────────────────────────
console.log('Generating app icons…')

const iconImages = []

for (const { size, scale, idiom } of ICON_SIZES) {
  const px       = Math.round(size * scale)
  // Unique filename: idiom-size@scalex.png  e.g. iphone-60@2x.png
  const filename = `${idiom}-${size}@${scale}x.png`
  const outPath  = path.join(ICON_DIR, filename)

  await sharp(Buffer.from(ICON_SVG))
    .resize(px, px)
    .png()
    .toFile(outPath)

  iconImages.push({ idiom, size: `${size}x${size}`, scale: `${scale}x`, filename })
  console.log(`  ✓ ${filename} (${px}×${px})`)
}

// Write Contents.json for Xcode
const iconsContents = {
  images: iconImages.map(img => ({
    idiom:    img.idiom,
    size:     img.size,
    scale:    img.scale,
    filename: img.filename,
  })),
  info: { version: 1, author: 'xcode' },
}
fs.writeFileSync(
  path.join(ICON_DIR, 'Contents.json'),
  JSON.stringify(iconsContents, null, 2)
)
console.log('  ✓ Contents.json')

// ── Generate splash screen ────────────────────────────────────────────────────
console.log('\nGenerating splash screen…')

// 1x  = 1366×1366 (for non-retina, but splash is usually 2x or 3x)
// 2x  = 2732×2732 (retina iPad / large iPhone)
for (const [scale, px] of [[1, 1366], [2, 2732]]) {
  const filename = `splash-${px}.png`
  await sharp(Buffer.from(SPLASH_SVG))
    .resize(px, px)
    .png()
    .toFile(path.join(SPLASH_DIR, filename))
  console.log(`  ✓ ${filename} (${px}×${px})`)
}

// Write Contents.json for splash
const splashContents = {
  images: [
    { idiom: 'universal', scale: '1x', filename: 'splash-1366.png' },
    { idiom: 'universal', scale: '2x', filename: 'splash-2732.png' },
    { idiom: 'universal', scale: '3x', filename: 'splash-2732.png' },
  ],
  info: { version: 1, author: 'xcode' },
}
fs.writeFileSync(
  path.join(SPLASH_DIR, 'Contents.json'),
  JSON.stringify(splashContents, null, 2)
)
console.log('  ✓ Contents.json')

console.log('\n✅ All assets generated!')
console.log('   Icons  →', ICON_DIR)
console.log('   Splash →', SPLASH_DIR)
