import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'environments/environment';

import { MetaService } from './meta.service';
import { TableroEquipo, TableroMeta } from './models/meta.models';

describe('MetaService', () => {
  let service: MetaService;
  let httpMock: HttpTestingController;

  const tableroMeta: TableroMeta = {
    periodo: '2026-11',
    calculadoEn: '2026-11-06T15:30:00',
    meta: 1000,
    vendido: 617,
    avance: 61.7,
    cantidadVentas: 4,
    diario: [{ fecha: '2026-11-03', vendido: 100 }],
    mensual: [{ periodo: '2026-11', vendido: 617, meta: 1000 }]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(MetaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('tableroEquipo_llamaAlEndpointAdmin', () => {
    const respuesta: TableroEquipo = { equipo: tableroMeta, vendedores: [] };
    let recibido: TableroEquipo | undefined;
    service.tableroEquipo().subscribe(r => (recibido = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/metas`);
    expect(req.request.method).toBe('GET');
    req.flush(respuesta);
    expect(recibido).toEqual(respuesta);
  });

  it('tableroVendedor_codificaCodigoYTipo', () => {
    let recibido: TableroMeta | undefined;
    service.tableroVendedor('010', '0').subscribe(r => (recibido = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/metas/vendedor/010/0`);
    expect(req.request.method).toBe('GET');
    req.flush(tableroMeta);
    expect(recibido).toEqual(tableroMeta);
  });

  it('tableroVendedor_codificaCaracteresEspeciales', () => {
    service.tableroVendedor('a/b', 'x y').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/metas/vendedor/a%2Fb/x%20y`);
    expect(req.request.method).toBe('GET');
    req.flush(tableroMeta);
  });
});
