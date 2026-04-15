"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface IframeProps {
  src: string;
  height: number;
  title?: string;
  allowResize?: boolean;
  className?: string;
}

export const Iframe = ({
  src,
  height,
  title = "Embedded content",
  allowResize = false,
  className,
}: IframeProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [dynamicHeight, setDynamicHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!allowResize) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "resize" &&
        typeof event.data?.height === "number"
      ) {
        setDynamicHeight(event.data.height);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [allowResize]);

  const resolvedHeight = dynamicHeight ?? height;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card",
        className
      )}
      style={{ height: `${resolvedHeight}px` }}
    >
      <iframe
        ref={iframeRef}
        className="h-full w-full border-0"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        src={src}
        title={title}
      />
    </div>
  );
};
