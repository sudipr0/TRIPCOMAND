export default async function run(page) {
  await page.getByRole("textbox", { name: /email/i }).fill("owner@demo.com");
  await page.locator('input[type="password"]').fill("Demo123!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 30000,
  });
  await page.goto(
    "http://localhost:5173/trips/4612f0c6-42ab-46ad-8aef-1c374815d9c1?tab=itinerary",
    {
      waitUntil: "networkidle",
    },
  );
  await page.waitForTimeout(2000);
  return {
    url: page.url(),
    buttons: await page.getByRole("button").allInnerTexts(),
    tabs: await page.getByRole("tab").allInnerTexts(),
    text: (await page.locator("main").innerText()).slice(0, 700),
  };
}
