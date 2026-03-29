import type { SiteConfig } from "@repo/models";

export const getDocsCollection = (
  config: SiteConfig
): SiteConfig["collections"][number] | undefined =>
  config.collections.find((collection) => collection.type === "docs");

export const getDocsNavigation = (config: SiteConfig) =>
  getDocsCollection(config)?.navigation ?? config.navigation;

export const getDocsCollectionWithNavigation = (
  config: SiteConfig
): SiteConfig["collections"][number] | undefined => {
  const docsCollection = getDocsCollection(config);
  const docsNavigation = getDocsNavigation(config);

  return docsCollection &&
    docsNavigation &&
    docsCollection.navigation !== docsNavigation
    ? { ...docsCollection, navigation: docsNavigation }
    : docsCollection;
};
