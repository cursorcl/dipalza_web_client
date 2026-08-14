import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from 'environments/environment';
import Swal from 'sweetalert2';

import { CrearUsuarioComponent } from './crear-usuario.component';
import { VendedorDTO } from 'app/mapa/models/model';
import { CrearUsuarioResult } from '../models/model';

describe('CrearUsuarioComponent', () => {
  let component: CrearUsuarioComponent;
  let fixture: ComponentFixture<CrearUsuarioComponent>;
  let httpMock: HttpTestingController;

  const vendedor: VendedorDTO = { codigo: '001', tipo: '0', nombre: 'Juan Perez' } as VendedorDTO;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearUsuarioComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), NgbActiveModal]
    }).compileComponents();

    fixture = TestBed.createComponent(CrearUsuarioComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/vendedores`).flush([vendedor]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('generarClave rellena el campo password con al menos 8 caracteres', () => {
    component.generarClave();
    expect(component.form.get('password')?.value.length).toBeGreaterThanOrEqual(8);
  });

  it('crea el usuario y cierra el modal con el resultado', () => {
    component.form.patchValue({ username: 'nuevo', email: 'nuevo@dipalza.cl', password: 'claveLarga1' });
    component.vendedorSeleccionado = vendedor;
    const closeSpy = spyOn(component.activeModal, 'close');

    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/usuarios`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      username: 'nuevo',
      email: 'nuevo@dipalza.cl',
      codigoVendedor: '001',
      tipoVendedor: '0',
      password: 'claveLarga1'
    });
    const result: CrearUsuarioResult = {
      usuario: { id: 1, username: 'nuevo', email: 'nuevo@dipalza.cl', codigoVendedor: '001', tipoVendedor: '0', nombreVendedor: 'Juan Perez', enabled: true, locked: false, createdAt: null },
      correoEnviado: true
    };
    req.flush(result);

    expect(closeSpy).toHaveBeenCalledWith(result);
  });

  it('muestra un toast con el mensaje de error del backend si falla la creación', () => {
    const swalSpy = spyOn(Swal, 'fire');
    component.form.patchValue({ username: 'jperez', password: 'claveLarga1' });

    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/usuarios`);
    req.flush({ message: 'Ya existe un usuario con ese username' }, { status: 400, statusText: 'Bad Request' });

    expect(swalSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      toast: true,
      icon: 'error',
      title: 'Ya existe un usuario con ese username'
    }));
  });

  it('no permite guardar si el formulario es inválido', () => {
    component.submit();
    httpMock.expectNone(`${environment.apiUrl}/usuarios`);
  });
});
