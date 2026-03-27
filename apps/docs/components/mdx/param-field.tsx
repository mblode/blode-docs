import type { ReactNode } from "react";

import { FieldLayout } from "./field-layout";

interface ParamFieldProps {
  path?: string;
  query?: string;
  body?: string;
  header?: string;
  type?: string;
  required?: boolean;
  deprecated?: boolean;
  default?: string;
  placeholder?: string;
  children?: ReactNode;
}

export const ParamField = ({
  path,
  query,
  body,
  header,
  type,
  required,
  deprecated,
  default: defaultValue,
  children,
}: ParamFieldProps) => {
  const name = path ?? query ?? body ?? header ?? "";

  let location: string | undefined;
  if (path) {
    location = "path";
  } else if (query) {
    location = "query";
  } else if (body) {
    location = "body";
  } else if (header) {
    location = "header";
  }

  const badges = location ? [{ label: location }] : undefined;

  return (
    <FieldLayout
      badges={badges}
      defaultValue={defaultValue}
      deprecated={deprecated}
      name={name}
      required={required}
      type={type}
    >
      {children}
    </FieldLayout>
  );
};
