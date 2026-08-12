import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';
import { environment } from 'environments/environment';
import Swal from 'sweetalert2';

import { ListadoUsuariosComponent } from './listado-usuarios.component';
import { Usuario } from '../models/model';

describe('ListadoUsuariosComponent', () => {
  let component: ListadoUsuariosComponent;
  let fixture: ComponentFixture<ListadoUsuariosComponent>;
  let httpMock: HttpTestingController;
  let modalSpy: jasmine.SpyObj<NgbModal>;

  const usuario: Usuario = {
    id: 1, username: 'jperez', email: 'j@dipalza.cl', codigoVendedor: null, tipoVendedor: null,
    nombreVendedor: null, enabled: true, locked: false, createdAt: null
  };

  beforeEach(async () => {
    modalSpy = jasmine.createSpyObj('NgbModal', ['open']);
    modalSpy.open.and.returnValue({ componentInstance: {}, closed: of(undefined) } as any);

    await TestBed.configureTestingModule({
      imports: [ListadoUsuariosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NgbModal, useValue: modalSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ListadoUsuariosComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/usuarios`).flush([usuario]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create y carga la lista', () => {
    expect(component.rows).toEqual([usuario]);
  });

  it('toggleHabilitado confirma y llama deshabilitar si el usuario está habilitado', () => {
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);

    component.toggleHabilitado(usuario);

    return fixture.whenStable().then(() => {
      const req = httpMock.expectOne(`${environment.apiUrl}/usuarios/1/deshabilitar`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ ...usuario, enabled: false });

      httpMock.expectOne(`${environment.apiUrl}/usuarios`).flush([{ ...usuario, enabled: false }]);
    });
  });

  it('toggleBloqueado no llama al backend si el usuario cancela la confirmación', () => {
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: false } as any);

    component.toggleBloqueado(usuario);

    return fixture.whenStable().then(() => {
      httpMock.expectNone(`${environment.apiUrl}/usuarios/1/bloquear`);
    });
  });
});
