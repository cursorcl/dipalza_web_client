import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { EMPTY, Subject } from 'rxjs';
import { environment } from 'environments/environment';

import { ListasPrecioComponent } from './listas-precio.component';
import { ListaPrecio } from '../services/lista-precio.service';
import { GestionListasPrecioComponent } from './gestion-listas-precio/gestion-listas-precio.component';

describe('ListasPrecioComponent', () => {
  let component: ListasPrecioComponent;
  let fixture: ComponentFixture<ListasPrecioComponent>;
  let httpMock: HttpTestingController;

  const listas: ListaPrecio[] = [
    { codigo: '001', nombre: 'lista general', rol: 'P' },
    { codigo: '500', nombre: 'DETALLE', rol: 'S' },
    { codigo: '100', nombre: '', rol: null }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListasPrecioComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ListasPrecioComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('debe cargar las listas de precio al iniciar', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/listas-precio`);
    expect(req.request.method).toBe('GET');
    req.flush(listas);

    expect(component.rows.length).toBe(3);
    expect(component.rows.find(l => l.codigo === '001')?.rol).toBe('P');
  });

  it('gestionar abre el modal de gestión', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/listas-precio`).flush(listas);

    const modalService = TestBed.inject(NgbModal);
    const modalRefStub = { closed: EMPTY, dismissed: EMPTY } as unknown as NgbModalRef;
    const openSpy = spyOn(modalService, 'open').and.returnValue(modalRefStub);

    component.gestionar();

    expect(openSpy).toHaveBeenCalledWith(GestionListasPrecioComponent, jasmine.objectContaining({ size: 'lg' }));
  });

  it('recarga la tabla cuando el modal se cierra con "Cerrar" (dismiss)', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/listas-precio`).flush(listas);

    const modalService = TestBed.inject(NgbModal);
    const dismissed$ = new Subject<unknown>();
    const modalRefStub = { closed: EMPTY, dismissed: dismissed$.asObservable() } as unknown as NgbModalRef;
    spyOn(modalService, 'open').and.returnValue(modalRefStub);

    component.gestionar();
    dismissed$.next(undefined);

    const req = httpMock.expectOne(`${environment.apiUrl}/listas-precio`);
    expect(req.request.method).toBe('GET');
    req.flush(listas);
  });

  it('recarga la tabla cuando el modal se cierra con un resultado (close)', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/listas-precio`).flush(listas);

    const modalService = TestBed.inject(NgbModal);
    const closed$ = new Subject<unknown>();
    const modalRefStub = { closed: closed$.asObservable(), dismissed: EMPTY } as unknown as NgbModalRef;
    spyOn(modalService, 'open').and.returnValue(modalRefStub);

    component.gestionar();
    closed$.next(undefined);

    const req = httpMock.expectOne(`${environment.apiUrl}/listas-precio`);
    expect(req.request.method).toBe('GET');
    req.flush(listas);
  });
});
