export const Video = ({ src }: { src: string }) => (
  <div className="video-embed">
    <iframe
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      src={src}
      title="Video"
    />
  </div>
);
