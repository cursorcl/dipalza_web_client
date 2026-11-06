import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from 'environments/environment';

import { MetasComponent } from './metas.component';
import { TableroEquipo } from './models/meta.models';

describe('MetasComponent', () => {
  let fixture: ComponentFixture<MetasComponent>;
  let httpMock: HttpTestingController;

  const url = `${environment.apiUrl}/admin/metas`;

  const tablero: TableroEquipo = {
    equipo: {
      periodo: '2026-11',
      calculadoEn: '2026-11-06T15:30:00',
      meta: 3000000,
      vendido: 1850000,
      avance: 61.7,
      cantidadVentas: 20,
      diario: [],
      mensual: []
    },
    vendedores: [
      { codigo: '010', tipo: '0', nombre: 'Ana Sobremeta', meta: 1000000, vendido: 1250000, avance: 125, cantidadVentas: 9 },
      { codigo: '020', tipo: '0', nombre: 'Beto Normal', meta: 2000000, vendido: 600000, avance: 30, cantidadVentas: 8 },
      { codigo: '030', tipo: '1', nombre: 'Carla Sinmeta', meta: null, vendido: 500000, avance: null, cantidadVentas: 3 }
    ]
  };

  function crear(): void {
    fixture = TestBed.createComponent(MetasComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  function responder(datos: TableroEquipo): void {
    httpMock.expectOne(url).flush(datos);
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const filas = () => Array.from(el().querySelectorAll('tbody tr'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-CL' }
      ]
    }).compileComponents();
  });

  afterEach(() => httpMock.verify());

  it('carga_muestraCifrasDelEquipo', () => {
    crear();
    expect(el().textContent).toContain('Cargando');
    responder(tablero);
    const texto = el().textContent ?? '';
    expect(texto).toContain('$ 3.000.000');
    expect(texto).toContain('$ 1.850.000');
    expect(texto).toContain('61,7 %');
    expect(texto).toContain('noviembre 2026');
    expect(texto).toContain('Actualizado a las 15:30');
  });

  it('tabla_muestraVendedoresEnElOrdenRecibido', () => {
    crear();
    responder(tablero);
    const nombres = filas().map(f => f.querySelector('td')?.textContent?.trim());
    expect(nombres).toEqual(['Ana Sobremeta', 'Beto Normal', 'Carla Sinmeta']);
  });

  it('tabla_sinMeta_muestraSinMeta', () => {
    crear();
    responder(tablero);
    const fila = filas()[2];
    expect(fila.textContent).toContain('Sin meta');
    expect(fila.textContent).not.toContain('NaN');
    expect(fila.textContent).not.toContain('Infinity');
    expect(fila.textContent).toContain('—');
  });

  it('tabla_avanceSobreCien_muestraRealYBarraAl100', () => {
    crear();
    responder(tablero);
    const fila = filas()[0];
    expect(fila.textContent).toContain('125,0 %');
    const barra = fila.querySelector('.progress-bar') as HTMLElement;
    expect(barra.style.width).toBe('100%');
  });

  it('vacio_muestraMensaje', () => {
    crear();
    responder({ ...tablero, vendedores: [] });
    expect(el().textContent).toContain('No hay vendedores con meta o ventas este mes.');
    expect(filas().length).toBe(0);
  });

  it('error_muestraMensajeYReintenta', () => {
    crear();
    httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(el().textContent).toContain('No se pudieron cargar las metas.');

    const reintentar = Array.from(el().querySelectorAll('button'))
      .find(b => b.textContent?.includes('Reintentar')) as HTMLButtonElement;
    reintentar.click();
    fixture.detectChanges();
    responder(tablero);
    expect(el().textContent).not.toContain('No se pudieron cargar las metas.');
    expect(filas().length).toBe(3);
  });

  it('muestraNotaDeVentasContadas', () => {
    crear();
    responder(tablero);
    expect(el().textContent).toContain('Se cuentan las ventas transferidas, sin flete, según su fecha de facturación.');
  });
});
