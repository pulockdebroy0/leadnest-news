import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, "..", "public");

const NAVY = "#1b2a4a";
const CRIMSON = "#a32623";
const GOLD = "#b8862e";
const PAPER = "#f7f6f2";
const INK = "#191b20";

function ensure(dir) {
  mkdirSync(path.join(pub, dir), { recursive: true });
}

// Deterministic pseudo-random from seed
function rand(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function coverSvg(seed, label) {
  const hues = [NAVY, CRIMSON, GOLD];
  const base = hues[seed % hues.length];
  const shapes = [];
  for (let i = 0; i < 5; i++) {
    const r = rand(seed * 13 + i) ;
    const cx = 80 + r * 640;
    const cy = 60 + rand(seed * 29 + i) * 300;
    const rad = 40 + rand(seed * 47 + i) * 140;
    const opacity = (0.06 + rand(seed * 61 + i) * 0.1).toFixed(2);
    shapes.push(`<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad.toFixed(0)}" fill="${PAPER}" opacity="${opacity}" />`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="${escapeXml(label)}">
  <rect width="800" height="450" fill="${base}" />
  ${shapes.join("\n  ")}
  <rect x="0" y="0" width="800" height="450" fill="url(#grad-${seed})" />
  <defs>
    <linearGradient id="grad-${seed}" x1="0" y1="0" x2="800" y2="450" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${INK}" stop-opacity="0.18" />
      <stop offset="1" stop-color="${INK}" stop-opacity="0" />
    </linearGradient>
  </defs>
  <g font-family="Georgia, serif" fill="${PAPER}" opacity="0.9">
    <text x="40" y="400" font-size="22" letter-spacing="2">LEADNEST</text>
  </g>
</svg>`;
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function personSvg(name, seed) {
  const hues = [NAVY, CRIMSON, GOLD];
  const base = hues[seed % hues.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Portrait placeholder for ${escapeXml(name)}">
  <rect width="400" height="400" fill="${base}" />
  <circle cx="200" cy="160" r="70" fill="${PAPER}" opacity="0.16" />
  <rect x="70" y="250" width="260" height="150" rx="130" fill="${PAPER}" opacity="0.12" />
  <text x="200" y="215" font-family="Georgia, serif" font-size="76" fill="${PAPER}" text-anchor="middle" opacity="0.95">${escapeXml(initials(name))}</text>
</svg>`;
}

function productSvg(name, seed) {
  const hues = [NAVY, GOLD, CRIMSON];
  const base = hues[seed % hues.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" role="img" aria-label="${escapeXml(name)}">
  <rect width="600" height="450" fill="${PAPER}" />
  <rect x="24" y="24" width="552" height="402" fill="none" stroke="${base}" stroke-width="2" />
  <rect x="150" y="120" width="300" height="210" rx="14" fill="${base}" opacity="0.9" />
  <circle cx="300" cy="225" r="46" fill="${PAPER}" opacity="0.85" />
  <text x="300" y="380" font-family="Georgia, serif" font-size="20" fill="${INK}" text-anchor="middle" letter-spacing="1">${escapeXml(name)}</text>
</svg>`;
}

// Article covers 1..8
ensure("articles");
for (let i = 1; i <= 8; i++) {
  writeFileSync(path.join(pub, "articles", `cover-${i}.svg`), coverSvg(i, `Leadnest News cover illustration ${i}`));
}

// Authors
ensure("authors");
const authors = ["Maya Farrow", "Daniel Osei", "Priya Nandakumar", "Tomás Rivera", "Eleanor Voss"];
authors.forEach((name, i) => {
  const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  writeFileSync(path.join(pub, "authors", `${slug}.svg`), personSvg(name, i));
});

// Biographies
ensure("biographies");
const bios = ["Helena Marchetti", "Kenji Watanabe", "Amara Okafor"];
bios.forEach((name, i) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  writeFileSync(path.join(pub, "biographies", `${slug}.svg`), personSvg(name, i + 2));
});

// Products
ensure("products");
const products = [
  ["Aurora Slate 14 Laptop", "aurora-slate-14"],
  ["Cadence Buds Pro", "cadence-buds-pro"],
  ["Mirrorless Buying Guide", "mirrorless-buying-guide"],
];
products.forEach(([name, slug], i) => {
  writeFileSync(path.join(pub, "products", `${slug}.svg`), productSvg(name, i));
});

// Logo (original wordmark mark, not a copy of any existing publisher's logo)
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Leadnest News logo">
  <rect width="512" height="512" rx="64" fill="${NAVY}" />
  <g fill="${PAPER}">
    <rect x="120" y="150" width="272" height="18" />
    <rect x="120" y="200" width="272" height="18" />
    <rect x="120" y="250" width="176" height="18" />
  </g>
  <circle cx="356" cy="322" r="10" fill="${CRIMSON}" />
</svg>`;
writeFileSync(path.join(pub, "logo.svg"), logo);

// Favicon (simplified mark)
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="${NAVY}" />
  <rect x="14" y="20" width="36" height="4" fill="${PAPER}" />
  <rect x="14" y="30" width="36" height="4" fill="${PAPER}" />
  <rect x="14" y="40" width="22" height="4" fill="${PAPER}" />
  <circle cx="48" cy="42" r="3" fill="${CRIMSON}" />
</svg>`;
writeFileSync(path.join(pub, "favicon.svg"), favicon);

// Default OG image
const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${NAVY}" />
  <g fill="${PAPER}">
    <rect x="90" y="240" width="620" height="24" />
    <rect x="90" y="290" width="620" height="24" />
    <rect x="90" y="340" width="380" height="24" />
  </g>
  <circle cx="760" cy="352" r="12" fill="${CRIMSON}" />
  <text x="90" y="470" font-family="Georgia, serif" font-size="64" fill="${PAPER}" letter-spacing="1">Leadnest News</text>
  <text x="90" y="510" font-family="Georgia, serif" font-size="26" fill="${GOLD}">Clarity, first.</text>
</svg>`;
writeFileSync(path.join(pub, "og-default.svg"), og);

console.log("Generated placeholder brand + article + person + product SVG imagery.");
