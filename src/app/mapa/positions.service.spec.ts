import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'environments/environment';

import { PositionsService } from './positions.service';
import { HistorialResumenDiaDTO } from './models/model';

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
});
