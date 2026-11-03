import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ListadoVendedoresFaltantesComponent } from './listado-vendedores-faltantes.component';
import { VentasService } from '../ventas.service';
import { FacturaFaltantesDTO, ItemFaltanteDTO } from '../models/model';

function item(codigoProducto: string, nroFactura: string | null): ItemFaltanteDTO {
  return {
    ventaDetalleId: 1, ventaId: 85, codigoProducto, nombreProducto: 'P' + codigoProducto,
    cantidadSolicitada: 2, cantidadAsignada: 0, cantidadFaltante: 2,
    piezasSolicitadas: null, piezasAsignadas: null, piezasFaltantes: null,
    motivo: 'Sin stock', nroFactura,
  } as ItemFaltanteDTO;
}

function grupo(nrosFactura: string[] | undefined, items: ItemFaltanteDTO[], nroFactura: string | null = null): FacturaFaltantesDTO {
  return {
    nroFactura, nrosFactura, ventaId: 85, rutCliente: '0075076150', codigoCliente: '001',
    nombreCliente: 'ROBERTO RAMOS NAVIA', codigoVendedor: '005', tipoVendedor: '0',
    nombreVendedor: 'JORGE ZAMORA', items,
  };
}

describe('ListadoVendedoresFaltantesComponent', () => {
  let fixture: ComponentFixture<ListadoVendedoresFaltantesComponent>;
  let component: ListadoVendedoresFaltantesComponent;
  let ventasServiceMock: jasmine.SpyObj<VentasService>;
  let router: Router;

  async function crear(queryParams: Record<string, string>, facturas: FacturaFaltantesDTO[] = []) {
    ventasServiceMock = jasmine.createSpyObj('VentasService', ['obtenerFaltantes']);
    ventasServiceMock.obtenerFaltantes.and.callFake((fecha?: string) =>
      of({ fecha: fecha ?? '2026-10-30', facturas }));

    await TestBed.configureTestingModule({
      imports: [ListadoVendedoresFaltantesComponent],
      providers: [
        provideRouter([]),
        { provide: VentasService, useValue: ventasServiceMock },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(ListadoVendedoresFaltantesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('sin parámetros pide la última fecha al backend y la deja en la URL', async () => {
    await crear({});

    expect(ventasServiceMock.obtenerFaltantes).toHaveBeenCalledWith(undefined);
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { fecha: '2026-10-30', vista: null },
      replaceUrl: true,
    }));
  });

  it('toma la fecha y la vista desde la URL', async () => {
    await crear({ fecha: '2026-10-15', vista: 'producto' });

    expect(ventasServiceMock.obtenerFaltantes).toHaveBeenCalledWith('2026-10-15');
    expect(component.vista).toBe('producto');
  });

  it('ignora una fecha con formato inválido en la URL', async () => {
    await crear({ fecha: 'ayer' });

    expect(ventasServiceMock.obtenerFaltantes).toHaveBeenCalledWith(undefined);
  });

  it('cambiar de vista actualiza la URL', async () => {
    await crear({});
    (router.navigate as jasmine.Spy).calls.reset();

    component.cambiarVista('producto');

    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { fecha: '2026-10-30', vista: 'producto' },
    }));
  });

  describe('vista por factura', () => {
    const texto = () => (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');

    it('muestra las facturas de la venta y marca la línea como no facturada', async () => {
      await crear({}, [grupo(['9418646', '9418653'], [item('421', null)], '9418646')]);
      fixture.detectChanges();

      const header = (fixture.nativeElement as HTMLElement).querySelector('.grupo-header')!.textContent!.replace(/\s+/g, ' ');
      expect(header).toContain('Facturas 9418646 / 9418653');
      expect(header).toContain('(Venta #85)');
      expect(texto()).toContain('No facturado');
    });

    it('un faltante parcial indica en qué factura se facturó la parte asignada', async () => {
      await crear({}, [grupo(['9418661'], [item('330', '9418661')], '9418661')]);
      fixture.detectChanges();

      expect(texto()).toContain('Factura 9418661');
      expect(texto()).toContain('Facturado parcial en 9418661');
      expect((fixture.nativeElement as HTMLElement).querySelector('tbody')!.textContent).not.toContain('No facturado');
    });

    it('si la venta no generó ninguna factura lo indica', async () => {
      await crear({}, [grupo([], [item('421', null)])]);
      fixture.detectChanges();

      expect(texto()).toContain('Venta #85 (sin factura)');
    });

    it('con un server anterior (sin nrosFactura) usa nroFactura', async () => {
      await crear({}, [grupo(undefined, [item('421', '9418646')], '9418646')]);
      fixture.detectChanges();

      expect(texto()).toContain('Factura 9418646');
    });
  });
});
