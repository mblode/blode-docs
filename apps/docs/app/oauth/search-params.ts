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

export const serializeSearchParams = (searchParams: OAuthSearchParams) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
      continue;
    }

    params.set(key, value);
  }

  return params.toString();
};

export const withSearchParams = (
  pathname: string,
  searchParamsString: string
): string =>
  searchParamsString ? `${pathname}?${searchParamsString}` : pathname;
