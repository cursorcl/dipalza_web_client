import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from 'environments/environment';

import { ModificarUsuarioComponent } from './modificar-usuario.component';
import { VendedorDTO } from 'app/mapa/models/model';
import { Usuario } from '../models/model';

describe('ModificarUsuarioComponent', () => {
  let component: ModificarUsuarioComponent;
  let fixture: ComponentFixture<ModificarUsuarioComponent>;
  let httpMock: HttpTestingController;

  const vendedor: VendedorDTO = { codigo: '001', tipo: '0', nombre: 'Juan Perez' } as VendedorDTO;
  const usuario: Usuario = {
    id: 1, username: 'jperez', email: 'j@dipalza.cl', codigoVendedor: '001', tipoVendedor: '0',
    nombreVendedor: 'Juan Perez', enabled: true, locked: false, createdAt: null
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModificarUsuarioComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), NgbActiveModal]
    }).compileComponents();

    fixture = TestBed.createComponent(ModificarUsuarioComponent);
    component = fixture.componentInstance;
    component.usuario = usuario;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/vendedores`).flush([vendedor]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create y precarga el formulario con los datos del usuario', () => {
    expect(component.form.get('email')?.value).toBe('j@dipalza.cl');
    expect(component.form.get('enabled')?.value).toBeTrue();
    expect(component.vendedorSeleccionado).toEqual(vendedor);
  });

  it('quitarVendedor limpia la selección', () => {
    component.quitarVendedor();
    expect(component.vendedorSeleccionado).toBeNull();
  });

  it('guarda los cambios y cierra el modal con el usuario actualizado', () => {
    component.form.patchValue({ enabled: false, locked: true });
    const closeSpy = spyOn(component.activeModal, 'close');

    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/usuarios/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      email: 'j@dipalza.cl',
      codigoVendedor: '001',
      tipoVendedor: '0',
      enabled: false,
      locked: true
    });
    const actualizado: Usuario = { ...usuario, enabled: false, locked: true };
    req.flush(actualizado);

    expect(closeSpy).toHaveBeenCalledWith(actualizado);
  });

  it('muestra el mensaje de error del backend si falla la actualización', () => {
    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/usuarios/1`);
    req.flush({ message: 'Ya existe un usuario con ese correo' }, { status: 400, statusText: 'Bad Request' });

    expect(component.error).toBe('Ya existe un usuario con ese correo');
  });
});
