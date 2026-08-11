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
});
