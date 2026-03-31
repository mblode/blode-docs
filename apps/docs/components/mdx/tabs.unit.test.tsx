import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CodeGroup } from "./code-group";
import { Tab, Tabs } from "./tabs";

describe("Tabs", () => {
  it("renders ARIA relationships for the active tab and panel", () => {
    const markup = renderToStaticMarkup(
      <Tabs>
        <Tab title="Install">npm install</Tab>
        <Tab title="Use">import x from y</Tab>
      </Tabs>
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-orientation="horizontal"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('aria-selected="false"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('tabindex="-1"');
    expect(markup).toContain('role="tab"');
    expect(markup).toMatch(/aria-controls="[^"]+"/);
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toMatch(/aria-labelledby="[^"]+"/);
  });
});

describe("CodeGroup", () => {
  it("renders tab semantics for grouped code blocks", () => {
    const markup = renderToStaticMarkup(
      <CodeGroup>
        <div data-rehype-pretty-code-title="npm">
          <pre className="language-bash">npm install pkg</pre>
        </div>
        <div data-rehype-pretty-code-title="pnpm">
          <pre className="language-bash">pnpm add pkg</pre>
        </div>
      </CodeGroup>
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-orientation="horizontal"');
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain(">npm<");
    expect(markup).toContain(">pnpm<");
    expect(markup).toContain('role="tab"');
    expect(markup).toMatch(/aria-controls="[^"]+"/);
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toMatch(/aria-labelledby="[^"]+"/);
  });
});
