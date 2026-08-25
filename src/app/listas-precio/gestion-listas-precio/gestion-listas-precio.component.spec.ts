import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from 'environments/environment';
import Swal from 'sweetalert2';

import { GestionListasPrecioComponent } from './gestion-listas-precio.component';
import { ListaPrecio } from '../../services/lista-precio.service';

describe('GestionListasPrecioComponent', () => {
  let component: GestionListasPrecioComponent;
  let fixture: ComponentFixture<GestionListasPrecioComponent>;
  let httpMock: HttpTestingController;

  const listas: ListaPrecio[] = [
    { codigo: '001', nombre: 'lista general', rol: 'P' },
    { codigo: '500', nombre: 'DETALLE', rol: 'S' },
    { codigo: '100', nombre: '', rol: null }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionListasPrecioComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), NgbActiveModal]
    }).compileComponents();

    fixture = TestBed.createComponent(GestionListasPrecioComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/listas-precio`).flush(listas);
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carga las listas al iniciar', () => {
    expect(component.rows).toEqual(listas);
  });

  it('marca como Principal tras confirmar y refresca la tabla', () => {
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);

    component.marcarComoPrincipal(listas[2]);

    return fixture.whenStable().then(() => {
      const req = httpMock.expectOne(`${environment.apiUrl}/listas-precio/P`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ codigoLista: '100' });
      req.flush(null);

      httpMock.expectOne(`${environment.apiUrl}/listas-precio`).flush(listas);
    });
  });

  it('marca como Secundaria tras confirmar y refresca la tabla', () => {
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);

    component.marcarComoSecundaria(listas[2]);

    return fixture.whenStable().then(() => {
      const req = httpMock.expectOne(`${environment.apiUrl}/listas-precio/S`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ codigoLista: '100' });
      req.flush(null);

      httpMock.expectOne(`${environment.apiUrl}/listas-precio`).flush(listas);
    });
  });

  it('quita la Secundaria tras confirmar y refresca la tabla', () => {
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);

    component.quitarSecundaria(listas[1]);

    return fixture.whenStable().then(() => {
      const req = httpMock.expectOne(`${environment.apiUrl}/listas-precio/secundaria`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      httpMock.expectOne(`${environment.apiUrl}/listas-precio`).flush(listas);
    });
  });

  it('no ejecuta el cambio si el usuario cancela la confirmación', () => {
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: false } as any);

    component.marcarComoPrincipal(listas[2]);

    return fixture.whenStable().then(() => {
      httpMock.expectNone(`${environment.apiUrl}/listas-precio/P`);
    });
  });

  it('muestra el mensaje de error del backend si falla el PUT', () => {
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);

    component.marcarComoPrincipal(listas[2]);

    return fixture.whenStable().then(() => {
      const req = httpMock.expectOne(`${environment.apiUrl}/listas-precio/P`);
      req.flush({ message: 'La lista de precio 100 ya está asignada al otro rol' }, { status: 400, statusText: 'Bad Request' });

      expect(component.error).toBe('La lista de precio 100 ya está asignada al otro rol');
    });
  });
});
