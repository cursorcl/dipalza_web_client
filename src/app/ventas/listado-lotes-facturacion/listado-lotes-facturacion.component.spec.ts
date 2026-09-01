import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ListadoLotesFacturacionComponent } from './listado-lotes-facturacion.component';
import { VentasService } from '../ventas.service';
import { LoteFacturacionResumen, PageResponse } from '../models/model';

describe('ListadoLotesFacturacionComponent', () => {
  let fixture: ComponentFixture<ListadoLotesFacturacionComponent>;
  let component: ListadoLotesFacturacionComponent;
  let ventasServiceMock: jasmine.SpyObj<VentasService>;
  let router: Router;

  const paginaEjemplo: PageResponse<LoteFacturacionResumen> = {
    content: [{
      id: 7, iniciadoEn: '2026-08-30T10:00:00', finalizadoEn: '2026-08-30T10:05:00',
      cantidadVentasProcesadas: 3, cantidadVentasExitosas: 3, cantidadVentasConError: 0,
      auditoriaIncompleta: false, totalFacturado: 15000
    }],
    totalElements: 1, totalPages: 1, number: 0, size: 20
  };

  beforeEach(async () => {
    ventasServiceMock = jasmine.createSpyObj('VentasService', ['obtenerLotesFacturacion']);
    ventasServiceMock.obtenerLotesFacturacion.and.returnValue(of(paginaEjemplo));

    await TestBed.configureTestingModule({
      imports: [ListadoLotesFacturacionComponent, RouterTestingModule],
      providers: [
        { provide: VentasService, useValue: ventasServiceMock }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(ListadoLotesFacturacionComponent);
    component = fixture.componentInstance;
  });

  it('carga la primera página al iniciar', () => {
    fixture.detectChanges();

    expect(ventasServiceMock.obtenerLotesFacturacion).toHaveBeenCalledWith(0, 20);
    expect(component.rows).toEqual(paginaEjemplo.content);
    expect(component.totalElements).toBe(1);
    expect(component.loadingIndicator).toBeFalse();
  });

  it('verDetalle navega a la ruta del lote seleccionado', () => {
    fixture.detectChanges();

    component.verDetalle(paginaEjemplo.content[0]);

    expect(router.navigate).toHaveBeenCalledWith(['/ventas/lotes-facturacion', 7]);
  });
});
