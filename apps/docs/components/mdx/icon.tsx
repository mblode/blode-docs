import { cn } from "@/lib/utils";

interface IconProps {
  icon: string;
  color?: string;
  size?: number;
  className?: string;
}

export const Icon = ({ icon, color, size = 16, className }: IconProps) => (
  <span
    aria-hidden
    className={cn("inline-flex items-center justify-center", className)}
    style={{
      color: color ?? undefined,
      height: size,
      width: size,
    }}
  >
    <svg
      className="size-full"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <title>{icon}</title>
      {icon === "flag" && (
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
      )}
      {icon === "check" && <path d="M20 6 9 17l-5-5" />}
      {icon === "star" && (
        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
      )}
      {icon === "info" && (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </>
      )}
      {icon === "alert-triangle" && (
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01" />
      )}
      {icon === "arrow-right" && <path d="M5 12h14M12 5l7 7-7 7" />}
      {icon === "external-link" && (
        <>
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </>
      )}
    </svg>
  </span>
);
