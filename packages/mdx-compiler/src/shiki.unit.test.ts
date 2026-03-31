import { describe, expect, it } from "vitest";

import { getHighlighter, SHIKI_THEME_PAIR } from "./shiki.js";

describe("Shiki theme config", () => {
  it("uses the audited GitHub theme pair and palette", async () => {
    expect(SHIKI_THEME_PAIR).toEqual({
      dark: "github-dark",
      light: "github-light",
    });

    const highlighter = await getHighlighter();
    const html = await highlighter.codeToHtml("const x = 1\nconsole.log(x)", {
      defaultColor: false,
      lang: "ts",
      themes: SHIKI_THEME_PAIR,
    });
    const normalizedHtml = html.toLowerCase();

    expect(normalizedHtml).toContain(
      'class="shiki shiki-themes github-dark github-light"'
    );
    expect(normalizedHtml).toContain("--shiki-light:#24292e");
    expect(normalizedHtml).toContain("--shiki-dark:#e1e4e8");
    expect(normalizedHtml).toContain("--shiki-light-bg:#fff");
    expect(normalizedHtml).toContain("--shiki-dark-bg:#24292e");
    expect(normalizedHtml).toContain("--shiki-light:#d73a49");
    expect(normalizedHtml).toContain("--shiki-dark:#f97583");
  });
});
