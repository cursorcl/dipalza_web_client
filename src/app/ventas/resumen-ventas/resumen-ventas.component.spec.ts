import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { ResumenVentasComponent } from './resumen-ventas.component';
import { VentasService } from '../ventas.service';
import { Venta } from '../models/model';

function buildVenta(overrides: Partial<Venta>): Venta {
  return {
    id: 1,
    fecha: '2026-07-17',
    rutCliente: '11111111-1',
    codigoCliente: 'C1',
    nombreCliente: 'Cliente Uno',
    codigoVendedor: 'V1',
    nombreVendedor: 'Vendedor Uno',
    codigoRuta: 'R1',
    nombreRuta: 'Ruta Uno',
    codigoCondicionVenta: 'CT',
    nombreCondicionVenta: 'Contado',
    totalDescuento: 0,
    totalIla: 0,
    totalIva: 0,
    totalNeto: 0,
    total: 0,
    estadoVenta: 'FINISHED',
    detalles: [],
    ...overrides
  };
}

describe('ResumenVentasComponent', () => {
  let component: ResumenVentasComponent;
  let fixture: ComponentFixture<ResumenVentasComponent>;
  let ventasServiceSpy: jasmine.SpyObj<VentasService>;

  beforeEach(async () => {
    ventasServiceSpy = jasmine.createSpyObj('VentasService', ['obtainSales']);

    await TestBed.configureTestingModule({
      imports: [ResumenVentasComponent],
      providers: [
        { provide: VentasService, useValue: ventasServiceSpy },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResumenVentasComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    ventasServiceSpy.obtainSales.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('debe pedir las ventas con estado FINISHED al iniciar', () => {
    ventasServiceSpy.obtainSales.and.returnValue(of([]));
    fixture.detectChanges();
    expect(ventasServiceSpy.obtainSales).toHaveBeenCalledWith({ estados: ['FINISHED'] });
  });

  it('debe calcular los totales agregados a partir de las ventas recibidas', () => {
    const ventas: Venta[] = [
      buildVenta({ id: 1, totalNeto: 1000, totalDescuento: 100, totalIva: 190, totalIla: 50, total: 1140 }),
      buildVenta({ id: 2, totalNeto: 2000, totalDescuento: 0, totalIva: 380, totalIla: 100, total: 2480 })
    ];
    ventasServiceSpy.obtainSales.and.returnValue(of(ventas));

    fixture.detectChanges();

    expect(component.cantidadVentas).toBe(2);
    expect(component.totalNeto).toBe(3000);
    expect(component.totalDescuento).toBe(100);
    expect(component.totalIva).toBe(570);
    expect(component.totalIla).toBe(150);
    expect(component.totalBruto).toBe(3620);
    expect(component.loadingIndicator).toBeFalse();
    expect(component.error).toBeFalse();
  });

  it('debe calcular totales en cero cuando no hay ventas pendientes', () => {
    ventasServiceSpy.obtainSales.and.returnValue(of([]));

    fixture.detectChanges();

    expect(component.cantidadVentas).toBe(0);
    expect(component.totalNeto).toBe(0);
    expect(component.totalBruto).toBe(0);
    expect(component.loadingIndicator).toBeFalse();
  });

  it('debe marcar error cuando la petición falla', () => {
    ventasServiceSpy.obtainSales.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    fixture.detectChanges();

    expect(component.error).toBeTrue();
    expect(component.loadingIndicator).toBeFalse();
  });

  it('cargarResumen() vuelve a pedir los datos y recalcula', () => {
    ventasServiceSpy.obtainSales.and.returnValue(of([buildVenta({ totalNeto: 500, total: 500 })]));
    fixture.detectChanges();
    expect(component.cantidadVentas).toBe(1);

    ventasServiceSpy.obtainSales.and.returnValue(of([
      buildVenta({ totalNeto: 500, total: 500 }),
      buildVenta({ totalNeto: 700, total: 700 })
    ]));
    component.cargarResumen();

    expect(component.cantidadVentas).toBe(2);
    expect(component.totalNeto).toBe(1200);
  });
});
