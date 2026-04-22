import type { ReactNode } from "react";

import { TenantAnalytics } from "@/components/tenant-analytics";

export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <TenantAnalytics />
    </>
  );
}
