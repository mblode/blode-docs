import type { ServerChannel } from "ssh2";

import type { DocPage, TenantDocs } from "./docs.js";

const A = {
  clear: "\x1b[2J\x1b[H",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  highlight: "\x1b[7m",
  underline: "\x1b[4m",
};

const crlf = (lines: string[]) => lines.join("\r\n");

const renderMenu = (
  docs: TenantDocs,
  selectedIndex: number,
  tenant: string,
  cols: number,
  rows: number
): string => {
  const divider = "─".repeat(Math.min(cols, 60));
  const header = [
    A.clear,
    `${A.bold}${A.green}$ ssh ${tenant}@blode.md${A.reset}`,
    "",
    `Browse ${A.bold}${docs.name}${A.reset} docs over SSH`,
    "",
    divider,
    "",
    `${A.dim}↑↓ navigate  Enter view  q quit${A.reset}`,
    "",
  ];

  const bodyHeight = rows - header.length - 2;
  const start = Math.max(
    0,
    selectedIndex - Math.floor(bodyHeight / 2)
  );
  const end = Math.min(docs.pages.length, start + bodyHeight);

  const items = docs.pages.slice(start, end).map((page, i) => {
    const idx = start + i;
    const prefix = idx === selectedIndex ? `${A.highlight} ` : "  ";
    const suffix = idx === selectedIndex ? ` ${A.reset}` : "";
    return `${prefix}${page.title}${suffix}`;
  });

  return crlf([...header, ...items]);
};

const renderPage = (
  content: string,
  scrollOffset: number,
  cols: number,
  rows: number
): string => {
  const lines = content.split("\n");
  const divider = "─".repeat(Math.min(cols, 60));
  const footerLines = 3;
  const visibleLines = rows - footerLines;
  const visible = lines.slice(scrollOffset, scrollOffset + visibleLines);
  const total = lines.length;
  const pos = `${scrollOffset + 1}/${total}`;

  return crlf([
    A.clear,
    ...visible,
    "",
    divider,
    `${A.dim}↑↓ scroll  Space page-down  b back  q quit  (${pos})${A.reset}`,
  ]);
};

export const runTui = async (
  channel: ServerChannel,
  docs: TenantDocs,
  tenant: string,
  fetchPage: (slug: string) => Promise<string | null>,
  initialRows: number,
  initialCols: number
): Promise<void> => {
  let rows = initialRows;
  let cols = initialCols;
  let selectedIndex = 0;
  let state: "menu" | "viewing" = "menu";
  let viewContent = "";
  let viewScroll = 0;

  // Allow the server to update terminal dimensions on resize
  (channel as unknown as { _rows?: number; _cols?: number })._rows = rows;

  const render = () => {
    if (state === "menu") {
      channel.write(renderMenu(docs, selectedIndex, tenant, cols, rows));
    } else {
      channel.write(renderPage(viewContent, viewScroll, cols, rows));
    }
  };

  channel.write(A.hideCursor);
  render();

  await new Promise<void>((resolve) => {
    channel.on("data", async (data: Buffer) => {
      const key = data.toString("utf8");

      if (state === "menu") {
        if (key === "\x1b[A" || key === "k") {
          selectedIndex = Math.max(0, selectedIndex - 1);
          render();
        } else if (key === "\x1b[B" || key === "j") {
          selectedIndex = Math.min(docs.pages.length - 1, selectedIndex + 1);
          render();
        } else if (key === "\r" || key === "\n") {
          const page = docs.pages[selectedIndex];
          if (page) {
            channel.write(`\r\n${A.dim}Loading…${A.reset}`);
            const content = await fetchPage(page.slug);
            if (content) {
              viewContent = content;
              viewScroll = 0;
              state = "viewing";
              render();
            }
          }
        } else if (key === "q" || key === "\x03") {
          channel.write(A.showCursor);
          resolve();
        }
      } else {
        const contentLines = viewContent.split("\n");
        const maxScroll = Math.max(0, contentLines.length - (rows - 3));

        if (key === "\x1b[A" || key === "k") {
          viewScroll = Math.max(0, viewScroll - 1);
          render();
        } else if (key === "\x1b[B" || key === "j") {
          viewScroll = Math.min(maxScroll, viewScroll + 1);
          render();
        } else if (key === " " || key === "\x1b[6~") {
          viewScroll = Math.min(maxScroll, viewScroll + Math.max(1, rows - 5));
          render();
        } else if (key === "b") {
          state = "menu";
          render();
        } else if (key === "q" || key === "\x03") {
          channel.write(A.showCursor);
          resolve();
        }
      }
    });

    channel.on("close", () => resolve());
    channel.on("end", () => resolve());
  });
};
