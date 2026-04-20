"use client";

import type * as React from "react";

type ButtonProps = React.ComponentProps<"button">;

const Button = ({ children, ...props }: ButtonProps) => (
  <button type="button" {...props}>
    {children}
  </button>
);

export { Button };
export type { ButtonProps };
