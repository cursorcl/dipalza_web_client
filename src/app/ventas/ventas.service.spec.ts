import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'environments/environment';
import { VentasService } from './ventas.service';
import { FacturacionResponse, LoteFacturacionDetalle, PageResponse, LoteFacturacionResumen } from './models/model';

describe('VentasService -- lotes de facturación', () => {
  let service: VentasService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [VentasService]
    });
    service = TestBed.inject(VentasService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('facture() retorna FacturacionResponse con loteId', () => {
    const respuestaEsperada: FacturacionResponse = { resultados: [], loteId: 7 };

    service.facture().subscribe(respuesta => {
      expect(respuesta.loteId).toBe(7);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/facturacion`);
    expect(req.request.method).toBe('POST');
    req.flush(respuestaEsperada);
  });

  it('obtenerLotesFacturacion() pide la página correcta', () => {
    const paginaEsperada: PageResponse<LoteFacturacionResumen> = {
      content: [], totalElements: 0, totalPages: 0, number: 0, size: 20
    };

    service.obtenerLotesFacturacion(0, 20).subscribe(pagina => {
      expect(pagina).toEqual(paginaEsperada);
    });

    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/facturacion/lotes`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    req.flush(paginaEsperada);
  });

  it('obtenerLoteFacturacionDetalle() pide el lote por id', () => {
    const detalleEsperado: LoteFacturacionDetalle = {
      id: 7, iniciadoEn: '2026-08-30T10:00:00', finalizadoEn: '2026-08-30T10:05:00',
      auditoriaIncompleta: false, ventas: [], stock: []
    };

    service.obtenerLoteFacturacionDetalle(7).subscribe(detalle => {
      expect(detalle).toEqual(detalleEsperado);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/facturacion/lotes/7`);
    expect(req.request.method).toBe('GET');
    req.flush(detalleEsperado);
  });
});
