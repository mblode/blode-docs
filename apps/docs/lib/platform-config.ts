const rootDomain = process.env.PLATFORM_ROOT_DOMAIN ?? "blode.md";

export const platformConfig = {
  assetPrefix: process.env.PLATFORM_ASSET_PREFIX ?? "",
  rootDomain,
};
