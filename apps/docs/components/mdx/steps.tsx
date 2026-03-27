import type { ReactNode } from "react";

interface StepsProps {
  children: ReactNode;
}

export const Steps = ({ children }: StepsProps) => (
  <div className="steps mb-12 [counter-reset:step] md:ml-4 md:border-l md:pl-8 [&>h3]:step">
    {children}
  </div>
);
