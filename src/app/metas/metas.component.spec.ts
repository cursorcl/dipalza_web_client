import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from 'environments/environment';

import { MetasComponent } from './metas.component';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { TableroEquipo, TableroMeta } from './models/meta.models';

describe('MetasComponent', () => {
  let fixture: ComponentFixture<MetasComponent>;
  let httpMock: HttpTestingController;

  const url = `${environment.apiUrl}/admin/metas`;
  const urlVendedor = `${environment.apiUrl}/admin/metas/vendedor/010/0`;

  const tableroVendedor: TableroMeta = {
    periodo: '2026-11',
    calculadoEn: '2026-11-06T15:30:00',
    meta: 1000000,
    vendido: 1250000,
    avance: 125,
    cantidadVentas: 9,
    diario: [{ fecha: '2026-11-01', vendido: 1250000 }],
    mensual: [{ periodo: '2026-11', vendido: 1250000, meta: 1000000 }]
  };

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
        provideCharts(withDefaultRegisterables()),
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

  describe('gráficos y selección', () => {
    const lienzos = () => Array.from(el().querySelectorAll('canvas'));
    const verEquipoBtn = () => Array.from(el().querySelectorAll('button'))
      .find(b => b.textContent?.includes('Ver equipo')) as HTMLButtonElement | undefined;

    it('graficos_porDefectoMuestranEquipo', () => {
      crear();
      responder(tablero);
      const componente = fixture.componentInstance;
      expect(componente.tableroGraficos).toBe(tablero.equipo);
      expect(lienzos().length).toBe(2);
      lienzos().forEach(c => expect(c.getAttribute('aria-label')).toContain('equipo'));
      expect(verEquipoBtn()).toBeUndefined();
    });

    it('seleccion_cargaTableroDelVendedorYMuestraNombre', () => {
      crear();
      responder(tablero);
      (filas()[0] as HTMLElement).click();
      fixture.detectChanges();
      httpMock.expectOne(urlVendedor).flush(tableroVendedor);
      fixture.detectChanges();
      expect(fixture.componentInstance.tableroGraficos).toBe(tableroVendedor);
      expect(el().querySelector('.vendedor-seleccionado')?.textContent).toContain('Ana Sobremeta');
      expect(verEquipoBtn()).toBeDefined();
      expect(filas()[0].getAttribute('aria-selected')).toBe('true');
      expect(filas()[1].getAttribute('aria-selected')).toBe('false');
    });

    it('seleccion_conTeclado', () => {
      crear();
      responder(tablero);
      filas()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();
      httpMock.expectOne(urlVendedor).flush(tableroVendedor);
      fixture.detectChanges();
      expect(fixture.componentInstance.seleccionado?.codigo).toBe('010');
    });

    it('seleccion_conEspacio', () => {
      crear();
      responder(tablero);
      filas()[0].dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      fixture.detectChanges();
      httpMock.expectOne(urlVendedor).flush(tableroVendedor);
      expect(fixture.componentInstance.seleccionado?.codigo).toBe('010');
    });

    it('verEquipo_vuelveAlTableroDelEquipo', () => {
      crear();
      responder(tablero);
      (filas()[0] as HTMLElement).click();
      httpMock.expectOne(urlVendedor).flush(tableroVendedor);
      fixture.detectChanges();
      verEquipoBtn()!.click();
      fixture.detectChanges();
      httpMock.expectNone(url);
      expect(fixture.componentInstance.tableroGraficos).toBe(tablero.equipo);
      expect(fixture.componentInstance.seleccionado).toBeNull();
      expect(verEquipoBtn()).toBeUndefined();
    });

    it('seleccion_errorDelVendedor_muestraErrorSinPerderTabla', () => {
      crear();
      responder(tablero);
      (filas()[0] as HTMLElement).click();
      httpMock.expectOne(urlVendedor).flush('error', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(el().textContent).toContain('No se pudo cargar el vendedor.');
      expect(fixture.componentInstance.errorGraficos).toBe('No se pudo cargar el vendedor.');
      expect(filas().length).toBe(3);
      expect(el().textContent).not.toContain('No se pudieron cargar las metas.');
    });

    it('seleccion_respuestaVieja_noPisaALaNueva', () => {
      crear();
      responder(tablero);
      (filas()[0] as HTMLElement).click();
      const primera = httpMock.expectOne(urlVendedor);
      (filas()[1] as HTMLElement).click();
      const segunda = httpMock.expectOne(`${environment.apiUrl}/admin/metas/vendedor/020/0`);
      expect(primera.cancelled).toBeTrue();
      segunda.flush({ ...tableroVendedor, vendido: 5 });
      expect(fixture.componentInstance.tableroGraficos?.vendido).toBe(5);
    });

    it('actualizar_deshabilitadoMientrasRecarga', () => {
      crear();
      responder(tablero);
      const actualizar = () => Array.from(el().querySelectorAll('button'))
        .find(b => b.textContent?.includes('Actualizar')) as HTMLButtonElement;
      expect(actualizar().disabled).toBeFalse();
      actualizar().click();
      fixture.detectChanges();
      expect(actualizar().disabled).toBeTrue();
      responder(tablero);
      expect(actualizar().disabled).toBeFalse();
    });

    it('cargar_respuestaVieja_noPisaALaNueva', () => {
      crear();
      const primera = httpMock.expectOne(url);
      fixture.componentInstance.cargar();
      const segunda = httpMock.expectOne(url);
      expect(primera.cancelled).toBeTrue();
      segunda.flush(tablero);
      expect(fixture.componentInstance.tablero).toBe(tablero);
    });

    it('refresco_cadaCincoMinutos', fakeAsync(() => {
      crear();
      httpMock.expectOne(url).flush(tablero);
      fixture.componentInstance.seleccionar(tablero.vendedores[0]);
      httpMock.expectOne(urlVendedor).flush(tableroVendedor);

      tick(300_000);
      httpMock.expectOne(url).flush(tablero);
      httpMock.expectOne(urlVendedor).flush(tableroVendedor);

      fixture.componentInstance.verEquipo();
      tick(300_000);
      httpMock.expectOne(url).flush(tablero);
      httpMock.expectNone(urlVendedor);
      fixture.destroy();
    }));

    it('refresco_seDetieneAlDestruir', fakeAsync(() => {
      crear();
      httpMock.expectOne(url).flush(tablero);
      fixture.destroy();
      tick(300_000);
      httpMock.expectNone(url);
    }));
  });
});
