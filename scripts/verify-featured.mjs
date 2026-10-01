import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const origin = process.argv[2] ?? "http://127.0.0.1:4174";
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`${origin}/featured`);
  assert.equal(response.status(), 200);
  const html = await response.text();
  assert.match(
    html,
    /<title>GhostJob Featured: Podcasts &amp; Press\.<\/title>/,
  );
  assert.match(
    html,
    /property="og:image" content="https:\/\/www\.jobghost\.io\/media\/featured-sharing\.jpg"/,
  );
  assert.match(
    html,
    /rel="canonical" href="https:\/\/www\.jobghost\.io\/featured"/,
  );
  assert.equal((html.match(/<title>/g) ?? []).length, 1);
  await page
    .getByRole("heading", { name: "GhostJob in the spotlight" })
    .waitFor();
  assert.equal(await page.locator("iframe").count(), 0);
  assert.equal(
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((r) => /youtube|ytimg/.test(r.name)),
    ),
    false,
  );
  for (const img of await page.locator("main img").all()) {
    assert.equal(
      await img.evaluate((el) => el.complete && el.naturalWidth > 0),
      true,
    );
  }
  await page.screenshot({
    path: "/tmp/ghostjob-featured-desktop.png",
    fullPage: true,
  });
  const load = page.getByRole("button", { name: "Load episode player" });
  await load.focus();
  await page.keyboard.press("Enter");
  await page.locator("iframe").waitFor();
  assert.equal(
    await page.locator("iframe").getAttribute("src"),
    "https://www.youtube-nocookie.com/embed/ArPZd4Pzaxk",
  );
  assert.equal(
    await page.getByRole("link", { name: "Watch on YouTube" }).isVisible(),
    true,
  );
  await page.getByRole("link", { name: "Check a LinkedIn job" }).click();
  await page.waitForURL("**/#scan");
  await page.waitForFunction(() => {
    const top = document.getElementById("scan")?.getBoundingClientRect().top;
    return top >= 110 && top < 160;
  });
  const sections = await page
    .locator("section")
    .evaluateAll((els) =>
      els.map((el) => ({
        id: el.id,
        spotlight: !!el.querySelector("#featured-spotlight-heading"),
      })),
    );
  const spotlightIndex = sections.findIndex((el) => el.spotlight);
  assert.equal(sections[spotlightIndex + 1].id, "features");
  await page
    .getByRole("heading", { name: "Fake recruiters. Real consequences." })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/ghostjob-homepage-spotlight.png" });
  await page.getByRole("link", { name: "Watch the episode" }).click();
  await page.waitForURL("**/featured#headhunters-nw");
  await page.waitForFunction(
    () =>
      Math.abs(
        document.getElementById("headhunters-nw").getBoundingClientRect().top -
          128,
      ) < 3,
  );
  assert.equal(await page.locator("iframe").count(), 0);
  await page.getByRole("link", { name: "Featured", exact: true }).click();
  await page.waitForURL("**/featured");
  await page.waitForFunction(() => window.scrollY === 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/ghostjob-featured-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await page.goto(`${origin}/`);
  await page
    .getByRole("heading", { name: "Fake recruiters. Real consequences." })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/ghostjob-homepage-mobile.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  for (const path of [
    "/media/featured-sharing.jpg",
    "/media/headhunters-nw-episode-067.webp",
    "/media/headhunters-nw-episode-067-thumbnail.webp",
  ]) {
    const media = await page.request.get(`${origin}${path}`);
    assert.equal(media.status(), 200);
    assert.match(media.headers()["content-type"], /^image\//);
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: initial metadata, local media, no early YouTube requests, keyboard activation, no autoplay, fallback, desktop/mobile layout, homepage order, footer, anchors, scanner navigation, and no page errors.",
  );
} finally {
  await browser.close();
}
