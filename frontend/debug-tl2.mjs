export default async function run(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`);
  });

  await page.getByRole('textbox', { name: /email/i }).fill('owner@demo.com');
  await page.locator('input[type="password"]').fill('Demo123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });

  await page.goto('http://localhost:5173/trips/4612f0c6-42ab-46ad-8aef-1c374815d9c1?tab=itinerary', {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(2500);

  return {
    errors,
    mainHtml: (await page.locator('main').innerHTML()).slice(0, 1500),
  };
}
