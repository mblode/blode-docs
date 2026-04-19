type SearchParamValue = string | string[] | undefined;

export type OAuthSearchParams = Record<string, SearchParamValue>;

export const getSearchParam = (
  searchParams: OAuthSearchParams,
  key: string
) => {
  const value = searchParams[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};
