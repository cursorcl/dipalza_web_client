import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { MapaComponent } from './mapa.component';
import { environment } from 'environments/environment';

describe('MapaComponent', () => {
  let component: MapaComponent;
  let fixture: ComponentFixture<MapaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('centrarEnVendedor no lanza error si el vendedorId no tiene marcador', () => {
    expect(() => component.centrarEnVendedor('no-existe')).not.toThrow();
  });

  it('un vendedor del padrón sin posición reportada aparece en la lista como "Sin datos" y offline', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    // La carga inicial de posiciones (GET /posicion) ya se dispara en ngAfterViewInit
    // dentro del beforeEach; la respondemos vacía para este caso.
    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([]);

    const reqVendedores = httpMock.expectOne(`${environment.apiUrl}/vendedores`);
    reqVendedores.flush([{ codigo: '001', tipo: '0', nombre: 'Juan Perez' }]);

    const lista = component.vendedores();
    expect(lista).toHaveSize(1);
    expect(lista[0].vendedorNombre).toBe('Juan Perez');
    expect(lista[0].tiempoRelativo).toBe('Sin datos');
    expect(lista[0].online).toBeFalse();
  });
});
