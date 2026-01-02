import { expect, test } from "@playwright/test";

test("landing page renders primary CTA", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Launch a docs platform that feels handcrafted.",
    })
  ).toBeVisible();

  const cta = page.getByRole("link", { name: "Start now" }).first();
  await expect(cta).toHaveAttribute(
    "href",
    "https://dashboard.neue.com/signup"
  );

  await expect(page.getByPlaceholder("Work email")).toBeVisible();
});
