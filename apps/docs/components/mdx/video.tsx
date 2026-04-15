import { cn } from "@/lib/utils";

type AspectRatio = "16:9" | "4:3" | "1:1" | "21:9";

const aspectRatioMap: Record<AspectRatio, string> = {
  "16:9": "pt-[56.25%]",
  "1:1": "pt-[100%]",
  "21:9": "pt-[42.86%]",
  "4:3": "pt-[75%]",
};

interface VideoProps {
  src: string;
  title?: string;
  height?: number;
  aspectRatio?: AspectRatio;
}

export const Video = ({
  src,
  title = "Video",
  height,
  aspectRatio = "16:9",
}: VideoProps) => {
  const useFixedHeight = typeof height === "number";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-black",
        !useFixedHeight && aspectRatioMap[aspectRatio]
      )}
      style={useFixedHeight ? { height: `${height}px` } : undefined}
    >
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
        sandbox="allow-popups allow-presentation allow-same-origin allow-scripts"
        src={src}
        title={title}
      />
    </div>
  );
};
