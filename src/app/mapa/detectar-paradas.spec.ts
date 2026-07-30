import { detectarParadas } from './detectar-paradas';
import { HistorialPosicionDTO } from './models/model';

function crearPunto(
  latitud: number,
  longitud: number,
  fechaHora: string
): HistorialPosicionDTO {
  return {
    id: 0,
    vendedorId: '001',
    vendedorCodigo: '0',
    vendedorNombre: 'Juan Perez',
    fechaHora,
    latitud,
    longitud
  };
}

describe('detectarParadas', () => {
  it('devuelve un arreglo vacío si no hay puntos', () => {
    expect(detectarParadas([])).toEqual([]);
  });

  it('un solo punto produce un único nodo marcado como inicio y fin', () => {
    const puntos = [crearPunto(-33.40, -70.60, '2026-07-26T09:00:00')];

    const nodos = detectarParadas(puntos);

    expect(nodos.length).toBe(1);
    expect(nodos[0]).toEqual({
      numero: 1,
      latitud: -33.40,
      longitud: -70.60,
      comienzo: '2026-07-26T09:00:00',
      fin: '2026-07-26T09:00:00',
      esInicio: true,
      esFin: true
    });
  });

  it('dos puntos lejanos entre sí (sin parada real) producen solo los nodos forzados de inicio y fin', () => {
    const puntos = [
      crearPunto(-33.40, -70.60, '2026-07-26T09:00:00'),
      crearPunto(-34.00, -71.00, '2026-07-26T09:05:00')
    ];

    const nodos = detectarParadas(puntos);

    expect(nodos.length).toBe(2);
    expect(nodos[0]).toEqual({
      numero: 1,
      latitud: -33.40,
      longitud: -70.60,
      comienzo: '2026-07-26T09:00:00',
      fin: '2026-07-26T09:00:00',
      esInicio: true,
      esFin: false
    });
    expect(nodos[1]).toEqual({
      numero: 2,
      latitud: -34.00,
      longitud: -71.00,
      comienzo: '2026-07-26T09:05:00',
      fin: '2026-07-26T09:05:00',
      esInicio: false,
      esFin: true
    });
  });

  it('detecta una parada real (>10 min en el mismo radio) entre el inicio y el fin', () => {
    const puntos = [
      crearPunto(-33.40, -70.60, '2026-07-26T09:00:00'),
      crearPunto(-34.00, -71.00, '2026-07-26T09:10:00'),
      crearPunto(-34.00, -71.00, '2026-07-26T09:25:00'),
      crearPunto(-35.00, -72.00, '2026-07-26T09:40:00')
    ];

    const nodos = detectarParadas(puntos);

    expect(nodos.length).toBe(3);
    expect(nodos[0]).toEqual(jasmine.objectContaining({
      numero: 1, esInicio: true, esFin: false, comienzo: '2026-07-26T09:00:00', fin: '2026-07-26T09:00:00'
    }));
    expect(nodos[1]).toEqual({
      numero: 2,
      latitud: -34.00,
      longitud: -71.00,
      comienzo: '2026-07-26T09:10:00',
      fin: '2026-07-26T09:25:00',
      esInicio: false,
      esFin: false
    });
    expect(nodos[2]).toEqual(jasmine.objectContaining({
      numero: 3, esInicio: false, esFin: true, comienzo: '2026-07-26T09:40:00', fin: '2026-07-26T09:40:00'
    }));
  });

  it('si el vendedor se queda todo el día en el mismo lugar, produce un único nodo con esInicio y esFin en true', () => {
    const puntos = [
      crearPunto(-33.40, -70.60, '2026-07-26T08:00:00'),
      crearPunto(-33.40, -70.60, '2026-07-26T08:20:00'),
      crearPunto(-33.40, -70.60, '2026-07-26T09:00:00')
    ];

    const nodos = detectarParadas(puntos);

    expect(nodos).toEqual([{
      numero: 1,
      latitud: -33.40,
      longitud: -70.60,
      comienzo: '2026-07-26T08:00:00',
      fin: '2026-07-26T09:00:00',
      esInicio: true,
      esFin: true
    }]);
  });

  it('dos puntos en el mismo lugar pero con menos de 10 minutos de diferencia igual producen nodos forzados de inicio y fin separados', () => {
    const puntos = [
      crearPunto(-33.40, -70.60, '2026-07-26T09:00:00'),
      crearPunto(-33.40, -70.60, '2026-07-26T09:05:00')
    ];

    const nodos = detectarParadas(puntos);

    expect(nodos.length).toBe(2);
    expect(nodos[0]).toEqual(jasmine.objectContaining({ numero: 1, esInicio: true, esFin: false, comienzo: '2026-07-26T09:00:00' }));
    expect(nodos[1]).toEqual(jasmine.objectContaining({ numero: 2, esInicio: false, esFin: true, comienzo: '2026-07-26T09:05:00' }));
  });
});
