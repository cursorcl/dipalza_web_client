import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'environments/environment';

import { VendedorService } from './vendedor.service';
import { VendedorDTO } from './models/model';

describe('VendedorService', () => {
  let service: VendedorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(VendedorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('hace GET a /vendedores y devuelve el padrón completo', () => {
    const padron: VendedorDTO[] = [
      { codigo: '001', tipo: '0', nombre: 'Juan Perez' },
      { codigo: '002', tipo: '0', nombre: 'Maria Soto' }
    ];

    service.getVendedores().subscribe((result) => {
      expect(result).toEqual(padron);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/vendedores`);
    expect(req.request.method).toBe('GET');
    req.flush(padron);
  });
});
