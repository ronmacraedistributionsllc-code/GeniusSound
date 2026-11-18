export function scenePrompt(s: { description: string; location: string | null; cameraAngle: string | null; cameraMove: string | null; lighting: string | null }, style: string | null) {
  return [s.description, s.location && `Location: ${s.location}`, s.cameraAngle && `Camera: ${s.cameraAngle}${s.cameraMove ? `, ${s.cameraMove}` : ''}`, s.lighting && `Lighting: ${s.lighting}`, style && `Style: ${style}`, 'cinematic music video, high quality']
    .filter(Boolean).join('. ');
}
