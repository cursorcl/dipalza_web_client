import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'environments/environment';

import { ListaPrecioService } from './lista-precio.service';

describe('ListaPrecioService', () => {
  let service: ListaPrecioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ListaPrecioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('marcarComoPrincipal hace PUT a /listas-precio/P con el codigoLista', () => {
    service.marcarComoPrincipal('100').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/listas-precio/P`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ codigoLista: '100' });
    req.flush(null);
  });

  it('marcarComoSecundaria hace PUT a /listas-precio/S con el codigoLista', () => {
    service.marcarComoSecundaria('500').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/listas-precio/S`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ codigoLista: '500' });
    req.flush(null);
  });

  it('quitarSecundaria hace DELETE a /listas-precio/secundaria', () => {
    service.quitarSecundaria().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/listas-precio/secundaria`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
