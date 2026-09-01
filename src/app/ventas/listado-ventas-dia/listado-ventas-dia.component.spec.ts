import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

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

  describe('facture()', () => {
    const resultadosEjemplo: VentaFacturaResultado[] = [
      { factura: '1', fecha: new Date(), total: 1000, items: [], mensaje: 'ok' }
    ];

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
  });
});
