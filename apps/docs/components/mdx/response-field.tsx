import type { ReactNode } from "react";

import { FieldLayout } from "./field-layout";

interface ResponseFieldProps {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  deprecated?: boolean;
  pre?: string[];
  post?: string[];
  children?: ReactNode;
}

export const ResponseField = ({
  name,
  type,
  default: defaultValue,
  required,
  deprecated,
  pre,
  post,
  children,
}: ResponseFieldProps) => {
  const preBadges = pre?.map((label) => ({ label })) ?? [];
  const postBadges = post?.map((label) => ({ label })) ?? [];
  const badges = [...preBadges, ...postBadges];

  return (
    <FieldLayout
      badges={badges.length > 0 ? badges : undefined}
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
