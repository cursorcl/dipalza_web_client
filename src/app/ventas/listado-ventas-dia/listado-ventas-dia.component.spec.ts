import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { ListadoVentasDiaComponent } from './listado-ventas-dia.component';
import { VentasService } from '../ventas.service';
import { DataResultService } from '../models/data-results.service';
import { FacturacionResponse, VentaFacturaResultado } from '../models/model';

describe('ListadoVentasDiaComponent', () => {
  let component: ListadoVentasDiaComponent;
  let fixture: ComponentFixture<ListadoVentasDiaComponent>;
  let ventasServiceMock: jasmine.SpyObj<VentasService>;
  let dataResultServiceMock: jasmine.SpyObj<DataResultService>;
  let router: Router;

  beforeEach(async () => {
    ventasServiceMock = jasmine.createSpyObj('VentasService', ['obtainSales', 'facture']);
    ventasServiceMock.obtainSales.and.returnValue(of([]));

    dataResultServiceMock = jasmine.createSpyObj('DataResultService', ['setResults', 'getResults']);

    await TestBed.configureTestingModule({
      imports: [ListadoVentasDiaComponent, RouterTestingModule],
      providers: [
        { provide: VentasService, useValue: ventasServiceMock },
        { provide: DataResultService, useValue: dataResultServiceMock }
      ]
    })
      .compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(ListadoVentasDiaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onSelect()', () => {
    it('habilita canFacture solo cuando hay filas seleccionadas', () => {
      const venta = { id: 1 } as any;

      component.onSelect({ selected: [venta] });
      expect(component.canFacture).toBeTrue();

      component.onSelect({ selected: [] });
      expect(component.canFacture).toBeFalse();
    });
  });

  describe('facture()', () => {
    const resultadosEjemplo: VentaFacturaResultado[] = [
      { factura: '1', fecha: new Date(), total: 1000, items: [], mensaje: 'ok' }
    ];

    beforeEach(() => {
      component.selected = [{ id: 5 } as any];
    });

    it('envía los ids de las ventas seleccionadas', () => {
      const respuesta: FacturacionResponse = { resultados: resultadosEjemplo, loteId: null };
      ventasServiceMock.facture.and.returnValue(of(respuesta));

      component.facture();

      expect(ventasServiceMock.facture).toHaveBeenCalledWith([5]);
    });

    it('cuando loteId es null, guarda los resultados y navega a resultados-facturacion', () => {
      const respuesta: FacturacionResponse = { resultados: resultadosEjemplo, loteId: null };
      ventasServiceMock.facture.and.returnValue(of(respuesta));

      component.facture();

      expect(dataResultServiceMock.setResults).toHaveBeenCalledWith(resultadosEjemplo);
      expect(router.navigate).toHaveBeenCalledWith(['/ventas/resultados-facturacion']);
    });

    it('cuando la respuesta es null (204 sin cuerpo), guarda una lista vacía y navega a resultados-facturacion sin lanzar error', () => {
      ventasServiceMock.facture.and.returnValue(of(null as unknown as FacturacionResponse));

      expect(() => component.facture()).not.toThrow();

      expect(dataResultServiceMock.setResults).toHaveBeenCalledWith([]);
      expect(router.navigate).toHaveBeenCalledWith(['/ventas/resultados-facturacion']);
    });

    it('cuando loteId viene con valor, navega al detalle del lote y no guarda resultados', () => {
      const respuesta: FacturacionResponse = { resultados: resultadosEjemplo, loteId: 7 };
      ventasServiceMock.facture.and.returnValue(of(respuesta));

      component.facture();

      expect(router.navigate).toHaveBeenCalledWith(['/ventas/lotes-facturacion', 7]);
      expect(dataResultServiceMock.setResults).not.toHaveBeenCalled();
    });

    it('activa "procesando" al presionar facturar y lo desactiva al recibir la respuesta', () => {
      ventasServiceMock.facture.and.returnValue(of({ resultados: [], loteId: null }));
      component.selected = [{ id: 1 } as any];

      expect(component.procesando).toBeFalse();
      component.facture();
      // Angular corre el observable síncronamente con `of(...)`, así que en este punto
      // ya se resolvió -- se verifica que quedó en false DESPUÉS de la respuesta.
      expect(component.procesando).toBeFalse();
    });

    it('activa procesando mientras la llamada esta en vuelo (observable asincrono)', () => {
      const sujeto = new Subject<FacturacionResponse>();
      ventasServiceMock.facture.and.returnValue(sujeto.asObservable());
      component.selected = [{ id: 1 } as any];

      expect(component.procesando).toBeFalse();

      component.facture();
      expect(component.procesando).toBeTrue();

      sujeto.next({ resultados: [], loteId: null });
      sujeto.complete();
      expect(component.procesando).toBeFalse();
    });

    it('deja procesando en false si la facturación falla', () => {
      ventasServiceMock.facture.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.selected = [{ id: 1 } as any];
      spyOn(window, 'alert');

      component.facture();

      expect(component.procesando).toBeFalse();
    });

    it('el boton Facturar queda deshabilitado mientras procesando es true', () => {
      component.canFacture = true;
      component.procesando = true;
      fixture.detectChanges();

      const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.btn-primary[disabled]');
      expect(boton).toBeTruthy();
    });
  });
});
