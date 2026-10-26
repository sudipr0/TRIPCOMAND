export default async function run(page) {
  await page.getByRole('textbox', { name: /email/i }).fill('owner@demo.com');
  await page.locator('input[type="password"]').fill('Demo123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });

  await page.goto('http://localhost:5173/trips/4612f0c6-42ab-46ad-8aef-1c374815d9c1?tab=itinerary', {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(2500);

  const buttons = await page.getByRole('button').allInnerTexts();
  const dayCount = await page.evaluate(async () => {
    const ws = JSON.parse(localStorage.getItem('trailcomand-workspace') || '{}').state.currentWorkspaceId;
    const res = await fetch(`/api/workspaces/${ws}/trips/4612f0c6-42ab-46ad-8aef-1c374815d9c1`, {
      headers: { 'X-Workspace-Id': ws },
      credentials: 'include',
    });
    const json = await res.json();
    return json.data.itineraryDays.length;
  });

  // The tab list and whether the itinerary tab is actually selected.
  return {
    buttons,
    itineraryDaysFromApi: dayCount,
    tabs: await page.getByRole('tab').allInnerTexts(),
    selectedTab: await page.locator('[role="tab"][aria-selected="true"]').innerText(),
    itineraryPanel: (await page.locator('[role="tabpanel"]').first().innerText()).slice(0, 300),
  };
}
