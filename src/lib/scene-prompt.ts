export function scenePrompt(s: { description: string; location: string | null; cameraAngle: string | null; cameraMove: string | null; lighting: string | null }, style: string | null) {
  return [
    s.description,
    s.location && `Location: ${s.location}`,
    s.cameraAngle && `Camera angle: ${s.cameraAngle}${s.cameraMove ? `, ${s.cameraMove}` : ''}`,
    s.lighting && `Lighting & mood: ${s.lighting}`,
    style && `Visual style & cinematography: ${style}`,
    'cinematic music video, professional production value, award-winning quality, 4K, color graded, sharp focus, dynamic composition'
  ]
    .filter(Boolean)
    .join('. ');
}
