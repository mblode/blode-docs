export const register = async () => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getHighlighter } = await import("./lib/shiki");
    await getHighlighter();
  }
};
