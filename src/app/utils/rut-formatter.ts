export function formatRut(value: string): string {
    if (!value) return '';

    // 1. Quitar ceros a la izquierda
    const clean = value.replace(/^0+/, '');

    // 2. Extraer cuerpo y DV
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);

    // 3. Formatear cuerpo con puntos
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${formattedBody}-${dv}`;
}