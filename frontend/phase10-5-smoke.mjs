// Phase 10.5 smoke test: office timeline view + client portal timeline.
const TRIP_ID = '4612f0c6-42ab-46ad-8aef-1c374815d9c1';
const BASE = 'http://localhost:5173';

export default async function run(page) {
  const steps = [];

  // ── Office: log in, open Itinerary tab, switch to Timeline ───────────────
  await page.getByRole('textbox', { name: /email/i }).fill('owner@demo.com');
  await page.locator('input[type="password"]').fill('Demo123!');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });

  await page.goto(`${BASE}/trips/${TRIP_ID}?tab=itinerary`, { waitUntil: 'networkidle' });
  // The trip query resolves after mount, so the toggle only exists once it lands.
  await page.getByRole('button', { name: 'Timeline View' }).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Timeline View' }).click();
  await page.waitForTimeout(800);

  const timeline = page.getByRole('list', { name: 'Trip timeline' });
  await timeline.waitFor({ timeout: 20000 });

  // Read the status label rendered on each day card.
  const officeStatuses = await page.locator('ol[aria-label="Trip timeline"] > li').evaluateAll((rows) =>
    rows.map((row) => row.innerText.split('\n').slice(0, 3).join(' | ')),
  );

  steps.push({
    step: 'office-timeline',
    dayCount: officeStatuses.length,
    statusControls: await page.getByRole('combobox', { name: /Status for day/ }).count(),
    rows: officeStatuses.slice(0, 6),
  });
  await page.screenshot({ path: '/tmp/phase10-5-office-timeline.png', fullPage: true });

  // ── Office: change Day 4 to DELAYED via the dropdown ─────────────────────
  const day4 = page.getByRole('combobox', { name: 'Status for day 4' });
  await day4.selectOption('DELAYED');
  await page.waitForTimeout(1200);
  const day4After = await page.getByRole('combobox', { name: 'Status for day 4' }).inputValue();
  steps.push({ step: 'office-status-change', day4Now: day4After });

  // Revert so the demo data stays as seeded.
  await page.getByRole('combobox', { name: 'Status for day 4' }).selectOption('PENDING');
  await page.waitForTimeout(1000);

  // ── Get a portal token, then view the timeline as the traveler ───────────
  const issued = await page.evaluate(async (tripId) => {
    const ws = JSON.parse(localStorage.getItem('trailcomand-workspace') || '{}').state.currentWorkspaceId;
    const tripRes = await fetch(`/api/workspaces/${ws}/trips/${tripId}`, {
      headers: { 'X-Workspace-Id': ws },
      credentials: 'include',
    });
    const travelers = (await tripRes.json()).data.travelers;
    const sarah = travelers.find((t) => t.fullName.includes('Sarah'));
    const res = await fetch(
      `/api/v1/workspaces/${ws}/trips/${tripId}/travelers/${sarah.id}/portal-access`,
      { method: 'POST', headers: { 'X-Workspace-Id': ws }, credentials: 'include' },
    );
    return { status: res.status, body: await res.json() };
  }, TRIP_ID);

  const token = issued.body?.data?.token;
  steps.push({ step: 'issued-link', apiStatus: issued.status, tokenLength: token?.length ?? 0 });
  if (!token) return { steps };

  const traveler = await page.context().browser().newContext({ viewport: { width: 420, height: 1000 } });
  const portal = await traveler.newPage();
  const portalErrors = [];
  portal.on('console', (m) => {
    if (m.type() === 'error') portalErrors.push(m.text());
  });

  await portal.goto(`${BASE}/portal/view/${token}`, { waitUntil: 'networkidle' });
  await portal.getByRole('list', { name: 'Trip timeline' }).waitFor({ timeout: 20000 });
  await portal.waitForTimeout(500);

  const portalStatuses = await portal.locator('ol[aria-label="Trip timeline"] > li').evaluateAll((rows) =>
    rows.map((row) => row.innerText.split('\n').slice(0, 3).join(' | ')),
  );
  const body = await portal.locator('body').innerText();

  steps.push({
    step: 'portal-timeline',
    dayCount: portalStatuses.length,
    rows: portalStatuses.slice(0, 6),
    noStatusControls: (await portal.getByRole('combobox').count()) === 0,
    leaksInternal: /internal notes|clientVisible|supplier/i.test(body),
    consoleErrors: portalErrors,
  });
  await portal.screenshot({ path: '/tmp/phase10-5-portal-timeline.png', fullPage: true });

  // ── Tampered token still rejected ────────────────────────
  const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
  const bad = await traveler.newPage();
  await bad.goto(`${BASE}/portal/view/${tampered}`, { waitUntil: 'networkidle' });
  await bad.waitForTimeout(800);
  steps.push({
    step: 'tampered-token',
    rejected: (await bad.locator('body').innerText()).includes('This link is not valid'),
  });

  await traveler.close();
  return { steps };
}
