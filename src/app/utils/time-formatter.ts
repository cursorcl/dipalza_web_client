export class TimeFormatter {

  static formatRelativeTime(fechaIso: string): string {
    if (!fechaIso) return 'Sin datos';

    const ultima = new Date(fechaIso).getTime();
    const ahora = new Date().getTime();
    const diffMs = ahora - ultima;
    
    // Evitar valores negativos por desfases mínimos entre cliente/servidor
    const diffSegundos = Math.max(0, Math.floor(diffMs / 1000));

    // Escala: Segundos
    if (diffSegundos < 60) {
      return `${diffSegundos} segundos`;
    }

    // Escala: Minutos y Segundos
    const diffMinutos = Math.floor(diffSegundos / 60);
    if (diffMinutos < 60) {
      const seg = diffSegundos % 60;
      return `${diffMinutos} min ${seg} seg`;
    }

    // Escala: Horas y Minutos
    const diffHoras = Math.floor(diffMinutos / 60);
    if (diffHoras < 24) {
      const min = diffMinutos % 60;
      return `${diffHoras} horas ${min} min`;
    }

    // Escala: Días y Horas
    const diffDias = Math.floor(diffHoras / 24);
    const hrs = diffHoras % 24;
    return `${diffDias} días ${hrs} horas`;
  }
}