import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { DetalleLoteFacturacionComponent } from './detalle-lote-facturacion.component';
import { VentasService } from '../ventas.service';
import { LoteFacturacionDetalle } from '../models/model';

describe('DetalleLoteFacturacionComponent', () => {
  let fixture: ComponentFixture<DetalleLoteFacturacionComponent>;
  let component: DetalleLoteFacturacionComponent;
  let ventasServiceMock: jasmine.SpyObj<VentasService>;

  const detalleEjemplo: LoteFacturacionDetalle = {
    id: 7, iniciadoEn: '2026-08-30T10:00:00', finalizadoEn: '2026-08-30T10:05:00',
    auditoriaIncompleta: false,
    ventas: [{
      ventaId: 900, exitosa: true, mensaje: 'Se ha grabado exitosamente la venta!!',
      facturas: [{
        identificador: 'ID-1', nroFactura: '0000123',
        items: [{
          codigoProducto: 'ART1', nroLinea: 1,
          precioVentaNetoEsperado: 100, cantidadAsignadaEsperada: 2,
          valorTotalVentaNetaEsperado: 200, valorTotalIvaEsperado: 38,
          valorTotalIlaEsperado: 0, valorTotalDescuentoEsperado: 0, error: null,
          precioVentaReal: 100, totalLineaReal: 200, precioCostoReal: 60,
          numerosAsignados: []
        }]
      }]
    }],
    stock: [{ articulo: 'ART1', stockAntes: 10, stockDespues: 8, totalFacturado: 200 }]
  };

  beforeEach(async () => {
    ventasServiceMock = jasmine.createSpyObj('VentasService', ['obtenerLoteFacturacionDetalle']);
    ventasServiceMock.obtenerLoteFacturacionDetalle.and.returnValue(of(detalleEjemplo));

    await TestBed.configureTestingModule({
      imports: [DetalleLoteFacturacionComponent],
      providers: [
        { provide: VentasService, useValue: ventasServiceMock },
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
});
