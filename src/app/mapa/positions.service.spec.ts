import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'environments/environment';

import { PositionsService } from './positions.service';
import { HistorialResumenDiaDTO, VentaPosicionDTO } from './models/model';

describe('PositionsService', () => {
  let service: PositionsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PositionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getResumenHistorico hace GET a /posicion/historico/resumen con el código y tipo del vendedor', () => {
    const resumen: HistorialResumenDiaDTO[] = [
      { dia: '2026-08-10', cantidadPuntos: 120, horaInicio: '2026-08-10T10:00:00', horaFin: '2026-08-10T19:00:00' }
    ];

    service.getResumenHistorico('001', '0').subscribe((result) => {
      expect(result).toEqual(resumen);
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/posicion/historico/resumen`
        && r.params.get('vendedorCodigo') === '001'
        && r.params.get('vendedorTipo') === '0'
    );
    expect(req.request.method).toBe('GET');
    req.flush(resumen);
  });

  it('getVentasDelDia hace GET a /ventas/posiciones con el vendedor y la fecha', () => {
    const ventas: VentaPosicionDTO[] = [];

    service.getVentasDelDia('001', '0', '2026-11-21').subscribe((result) => {
      expect(result).toEqual(ventas);
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/ventas/posiciones`
        && r.params.get('codigoVendedor') === '001'
        && r.params.get('tipoVendedor') === '0'
        && r.params.get('fecha') === '2026-11-21'
    );
    expect(req.request.method).toBe('GET');
    req.flush(ventas);
  });
});
