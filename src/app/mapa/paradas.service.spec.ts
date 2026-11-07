import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'environments/environment';

import { ParadasService } from './paradas.service';
import { ParadaVendedorDTO, PositionFilter } from './models/model';

describe('ParadasService', () => {
  let service: ParadasService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ParadasService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getHistorico hace POST a /deteccion/historico con el filtro', () => {
    const filtro: PositionFilter = {
      vendedorIds: [{ codigo: '001', tipo: '0' }],
      desde: '2026-08-10T00:00:00',
      hasta: '2026-08-10T23:59:59'
    };
    const paradas: ParadaVendedorDTO[] = [
      {
        id: 1, vendedorId: '001', vendedorCodigo: '001', vendedorNombre: 'Vendedor Uno',
        latitud: -33.45, longitud: -70.66, calle: 'Av. Siempre Viva 742',
        horaInicio: '2026-08-10T10:00:00', horaFin: '2026-08-10T10:20:00', enCurso: false
      }
    ];

    service.getHistorico(filtro).subscribe((result) => {
      expect(result).toEqual(paradas);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/deteccion/historico`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(filtro);
    req.flush(paradas);
  });
});
