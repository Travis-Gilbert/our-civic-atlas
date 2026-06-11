// @ts-nocheck
/**
 * ResponsiveImg: <picture> wrapper with WebP + JPEG srcset.
 * Expects optimized variants at {base}-sm.webp, {base}-md.webp, etc.
 *
 * Props:
 *  - src: original path, e.g. "/photos/photo-wide-crowd.jpg"
 *  - alt, loading, fetchPriority, style, className, sizes
 *  - width, height: intrinsic dimensions for CLS prevention
 */
export default function ResponsiveImg({
  src,
  alt,
  width,
  height,
  sizes = '100vw',
  loading = 'lazy',
  fetchPriority,
  style,
  className,
  ...props
}) {
  // Derive base name: "/photos/photo-wide-crowd.jpg" -> "/photos/photo-wide-crowd"
  const base = src.replace(/\.\w+$/, '');

  return (
    <picture>
      <source
        type="image/webp"
        srcSet={`${base}-sm.webp 640w, ${base}-md.webp 1280w, ${base}-lg.webp 2000w`}
        sizes={sizes}
      />
      <img
        src={src}
        srcSet={`${base}-sm.jpg 640w, ${base}-md.jpg 1280w, ${base}-lg.jpg 2000w`}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        fetchPriority={fetchPriority}
        className={className}
        style={{
          aspectRatio: width && height ? `${width}/${height}` : undefined,
          ...style,
        }}
        {...props}
      />
    </picture>
  );
}
