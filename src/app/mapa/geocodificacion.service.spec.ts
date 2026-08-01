import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { GeocodificacionService } from './geocodificacion.service';
import { environment } from 'environments/environment';

describe('GeocodificacionService', () => {
  let service: GeocodificacionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GeocodificacionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('hace GET a /geocodificacion/inversa con lat y lon como query params', () => {
    let respuesta: { calle: string } | undefined;
    service.obtenerCalle(-33.0393, -71.6273).subscribe(r => respuesta = r);

    const req = httpMock.expectOne(
      r => r.url === `${environment.apiUrl}/geocodificacion/inversa`
        && r.params.get('lat') === '-33.0393'
        && r.params.get('lon') === '-71.6273'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ calle: 'Av. Errázuriz' });

    expect(respuesta).toEqual({ calle: 'Av. Errázuriz' });
  });
});
