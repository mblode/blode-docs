import { expect, test } from "@playwright/test";

test("landing page renders primary CTA", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Documentation should ship as fast as code.",
    })
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: "Get started" }).first()
  ).toHaveAttribute("href", "#get-started");
  await expect(
    page.getByRole("link", { name: "Read the docs" })
  ).toHaveAttribute("href", "https://docs.blode.md");
  await expect(
    page.getByRole("heading", {
      name: "Ship your first doc in under a minute.",
    })
  ).toBeVisible();
});
