import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';

import { ListadoNumeradosComponent } from './listado-numerados.component';
import { GestionProductosNumeradosComponent } from '../gestion-productos-numerados/gestion-productos-numerados.component';

describe('ListadoNumeradosComponent', () => {
  let component: ListadoNumeradosComponent;
  let fixture: ComponentFixture<ListadoNumeradosComponent>;
  let modalSpy: jasmine.SpyObj<NgbModal>;

  beforeEach(async () => {
    modalSpy = jasmine.createSpyObj('NgbModal', ['open']);
    modalSpy.open.and.returnValue({ closed: of(undefined) } as any);

    await TestBed.configureTestingModule({
      imports: [ListadoNumeradosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NgbModal, useValue: modalSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListadoNumeradosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('gestionarProductosNumerados abre el diálogo de gestión de productos numerados', () => {
    component.gestionarProductosNumerados();

    expect(modalSpy.open).toHaveBeenCalledWith(GestionProductosNumeradosComponent, jasmine.any(Object));
  });

  it('muestra el listado ordenado por código de menor a mayor por defecto', async () => {
    const fila = (codigoProducto: string) => ({ codigoProducto, nombreProducto: 'P' + codigoProducto, peso: 1, piezas: 1 });
    component.rows = [fila('120'), fila('9'), fila('45'), fila('10')];
    component.loadingIndicator = false;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const codigos = Array.from(fixture.nativeElement.querySelectorAll('datatable-body-row') as NodeListOf<HTMLElement>)
      .map(r => r.querySelector('datatable-body-cell')!.textContent!.trim());
    expect(codigos).toEqual(['9', '10', '45', '120']);
  });
});
