import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'fs';

const BASE = 'http://localhost:8081';
const OUT  = './ux-screenshots';
const VIEWPORT = { width: 390, height: 844 }; // iPhone 14

if (!existsSync(OUT)) mkdirSync(OUT);

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const ctx     = await browser.newContext({ viewport: VIEWPORT });
const page    = await ctx.newPage();

async function shot(name, waitMs = 1800) {
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log(`✓ ${name}.png`);
}

// 1. Login
await page.goto(BASE);
await shot('01-login', 2500);

// 2. Login rempli (email + mdp)
await page.fill('input[type="email"], input[placeholder*="mail"], input[placeholder*="Email"]', 'admin@logistic.fr').catch(() => {});
await page.fill('input[type="password"], input[placeholder*="mot"], input[placeholder*="asse"]', '1234').catch(() => {});
await shot('02-login-filled', 800);

// 3. Dashboard — connexion admin
await page.click('button, [role="button"]').catch(() => {});
await page.waitForTimeout(3000);
await shot('03-dashboard', 1500);

// 4. Planning
await page.goto(`${BASE}/planning`);
await shot('04-planning', 2500);

// 5. Driver
await page.goto(`${BASE}/driver?id=1`);
await shot('05-driver', 2500);

// 6. Imprévus
await page.goto(`${BASE}/imprevus`);
await shot('06-imprevus', 2500);

await browser.close();
console.log('\nDone — screenshots in', OUT);
