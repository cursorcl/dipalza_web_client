export function generateColorPellete(qunatity: number): string[] {
  const colors: string[] = [];
  const step = 360 / qunatity; // Distribuimos los 360 grados del círculo

  for (let i = 0; i < qunatity; i++) {
    const hue = i * step;
    // Saturation 70% y Lightness 50% para colores vivos y legibles
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }
  return colors;
}