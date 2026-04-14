export const Video = ({ src }: { src: string }) => (
  <div className="relative overflow-hidden rounded-xl border border-border bg-black pt-[56.25%]">
    <iframe
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="absolute inset-0 h-full w-full border-0"
      sandbox="allow-popups allow-presentation allow-same-origin allow-scripts"
      src={src}
      title="Video"
    />
  </div>
);
