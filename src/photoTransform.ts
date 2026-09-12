export type PhotoTransform = { x: number; y: number; scale: number; rotation: number };

export function constrainPhotoTranslation(
  transform: PhotoTransform,
  image: { width: number; height: number },
  viewport: { width: number; height: number },
  minimumVisible = 64
): PhotoTransform {
  if (!image.width || !image.height || !viewport.width || !viewport.height) return transform;
  const angle = transform.rotation * Math.PI / 180;
  const boxWidth = (Math.abs(Math.cos(angle)) * image.width + Math.abs(Math.sin(angle)) * image.height) * transform.scale;
  const boxHeight = (Math.abs(Math.sin(angle)) * image.width + Math.abs(Math.cos(angle)) * image.height) * transform.scale;
  const visibleX = Math.min(minimumVisible, boxWidth, viewport.width);
  const visibleY = Math.min(minimumVisible, boxHeight, viewport.height);
  const maxX = Math.max(0, viewport.width / 2 + boxWidth / 2 - visibleX);
  const maxY = Math.max(0, viewport.height / 2 + boxHeight / 2 - visibleY);
  return {
    ...transform,
    x: Math.max(-maxX, Math.min(maxX, transform.x)),
    y: Math.max(-maxY, Math.min(maxY, transform.y))
  };
}
