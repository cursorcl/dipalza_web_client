import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DetalleLoteFacturacionComponent } from './detalle-lote-facturacion.component';
import { VentasService } from '../ventas.service';
import { LoteFacturacionDetalle } from '../models/model';

describe('DetalleLoteFacturacionComponent', () => {
  let fixture: ComponentFixture<DetalleLoteFacturacionComponent>;
  let component: DetalleLoteFacturacionComponent;
  let ventasServiceMock: jasmine.SpyObj<VentasService>;
  let modalServiceMock: jasmine.SpyObj<NgbModal>;

  const detalleEjemplo: LoteFacturacionDetalle = {
    id: 7, iniciadoEn: '2026-08-30T10:00:00', finalizadoEn: '2026-08-30T10:05:00',
    auditoriaIncompleta: false,
    ventas: [{
      ventaId: 900, exitosa: true, mensaje: 'Se ha grabado exitosamente la venta!!',
      rutCliente: '11111111-1', nombreCliente: 'Cliente de Prueba',
      codigoVendedor: 'V01', nombreVendedor: 'Vendedor de Prueba',
      facturas: [{
        identificador: 'ID-1', nroFactura: '0000123',
        items: [{
          codigoProducto: 'ART1', nroLinea: 1,
          precioVentaNetoEsperado: 100, cantidadAsignadaEsperada: 2,
          valorTotalVentaNetaEsperado: 200, valorTotalIvaEsperado: 38,
          valorTotalIlaEsperado: 0, valorTotalDescuentoEsperado: 0, error: null,
          precioVentaReal: 100, totalLineaReal: 200, precioCostoReal: 60,
          numerosAsignados: [], cantidadReal: 2, esNumerado: false,
          stockAntes: 10, stockDespues: 8
        }]
      }]
    }],
    stock: [{ articulo: 'ART1', stockAntes: 10, stockDespues: 8, totalFacturado: 200 }]
  };

  beforeEach(async () => {
    ventasServiceMock = jasmine.createSpyObj('VentasService', ['obtenerLoteFacturacionDetalle']);
    ventasServiceMock.obtenerLoteFacturacionDetalle.and.returnValue(of(detalleEjemplo));
    modalServiceMock = jasmine.createSpyObj('NgbModal', ['open']);
    modalServiceMock.open.and.returnValue({ componentInstance: {} } as any);

    await TestBed.configureTestingModule({
      imports: [DetalleLoteFacturacionComponent],
      providers: [
        { provide: VentasService, useValue: ventasServiceMock },
        { provide: NgbModal, useValue: modalServiceMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleLoteFacturacionComponent);
    component = fixture.componentInstance;
  });

  it('carga el detalle del lote según el id de la ruta', () => {
    fixture.detectChanges();

    expect(ventasServiceMock.obtenerLoteFacturacionDetalle).toHaveBeenCalledWith(7);
    expect(component.detalle).toEqual(detalleEjemplo);
    expect(component.cargando).toBeFalse();
  });

  it('diferenciaSignificativa detecta diferencias mayores a 0.5', () => {
    expect(component.diferenciaSignificativa(100, 100)).toBeFalse();
    expect(component.diferenciaSignificativa(100, 90)).toBeTrue();
    expect(component.diferenciaSignificativa(100, null)).toBeTrue();
  });

  it('no hay ninguna venta ni factura seleccionada al cargar', () => {
    fixture.detectChanges();

    expect(component.ventaSeleccionada).toBeNull();
    expect(component.facturaAbiertaIdentificador).toBeNull();
  });

  it('seleccionarVenta selecciona la venta y limpia la factura abierta', () => {
    fixture.detectChanges();
    const venta = detalleEjemplo.ventas[0];

    component.seleccionarVenta(venta);
    expect(component.ventaSeleccionada).toBe(venta);

    component.toggleFactura(venta.facturas[0]);
    expect(component.facturaAbiertaIdentificador).toBe('ID-1');

    // Volver a seleccionar la misma venta la deselecciona y cierra la factura.
    component.seleccionarVenta(venta);
    expect(component.ventaSeleccionada).toBeNull();
    expect(component.facturaAbiertaIdentificador).toBeNull();
  });

  it('toggleFactura colapsa la factura si ya estaba abierta', () => {
    fixture.detectChanges();
    const factura = detalleEjemplo.ventas[0].facturas[0];

    component.toggleFactura(factura);
    expect(component.facturaAbiertaIdentificador).toBe('ID-1');

    component.toggleFactura(factura);
    expect(component.facturaAbiertaIdentificador).toBeNull();
  });

  it('verStock abre el modal con el item seleccionado', () => {
    fixture.detectChanges();
    const item = detalleEjemplo.ventas[0].facturas[0].items[0];
    const componentInstance: any = {};
    modalServiceMock.open.and.returnValue({ componentInstance } as any);

    component.verStock(item);

    expect(modalServiceMock.open).toHaveBeenCalled();
    expect(componentInstance.item).toBe(item);
  });
});
