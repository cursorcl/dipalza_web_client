/// <reference types="jasmine" />
import { UntypedFormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CambiarClaveObligatorioComponent } from 'app/perfil/cambiar-clave-obligatorio/cambiar-clave-obligatorio.component';
import { of, throwError, Subject } from 'rxjs';
import { SigninComponent } from './signin.component';
import { ProductoService } from 'app/services/producto.service';

describe('SigninComponent', () => {
  let component: SigninComponent;
  let formBuilder: UntypedFormBuilder;
  let authServiceMock: any;
  let routerMock: any;
  let productoServiceMock: any;
  let ngbModalMock: any;

  beforeEach(() => {
    authServiceMock = {
      login: jasmine.createSpy('login').and.returnValue(of({ token: 'test-token', mustChangePassword: false })),
      currentUserValue: { token: 'test-token', mustChangePassword: false },
      logout: jasmine.createSpy('logout')
    };

    routerMock = {
      navigate: jasmine.createSpy('navigate')
    };

    productoServiceMock = {
      loadProductos: jasmine.createSpy('loadProductos').and.returnValue(of([]))
    };

    ngbModalMock = {
      open: jasmine.createSpy('open').and.returnValue({
        componentInstance: {},
        closed: of(undefined),
      }),
    };

    formBuilder = new UntypedFormBuilder();

    component = new SigninComponent(
      formBuilder,
      routerMock,
      authServiceMock as AuthService,
      productoServiceMock as ProductoService,
      ngbModalMock as unknown as NgbModal
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('reabre el diálogo bloqueante al montar si mustChangePassword es true', () => {
      authServiceMock.currentUserValue = { token: 'test-token', mustChangePassword: true };

      component.ngOnInit();

      expect(ngbModalMock.open).toHaveBeenCalledWith(
        CambiarClaveObligatorioComponent,
        jasmine.objectContaining({ backdrop: 'static', keyboard: false }),
      );
    });

    it('no abre el diálogo al montar si mustChangePassword es false', () => {
      authServiceMock.currentUserValue = { token: 'test-token', mustChangePassword: false };

      component.ngOnInit();

      expect(ngbModalMock.open).not.toHaveBeenCalled();
    });

    it('no envía claveActualForzada al reabrir el diálogo al montar (no la tenemos disponible)', () => {
      authServiceMock.currentUserValue = { token: 'test-token', mustChangePassword: true };
      const modalRef = { componentInstance: {} as any, closed: of(undefined) };
      ngbModalMock.open.and.returnValue(modalRef);

      component.ngOnInit();

      expect(modalRef.componentInstance.claveActualForzada).toBeUndefined();
    });

    it('debería crear el formulario con valores por defecto', () => {
      component.ngOnInit();
      expect(component.loginForm).toBeTruthy();
      expect(component.loginForm.get('username')?.value).toBe('');
      expect(component.loginForm.get('password')?.value).toBe('');
    });

    it('debería marcar username como requerido', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('');
      component.loginForm.get('username')?.markAsDirty();
      expect(component.loginForm.get('username')?.hasError('required')).toBeTrue();
    });

    it('debería marcar password como requerido', () => {
      component.ngOnInit();
      component.loginForm.get('password')?.setValue('');
      component.loginForm.get('password')?.markAsDirty();
      expect(component.loginForm.get('password')?.hasError('required')).toBeTrue();
    });

    it('debería validar que el formulario inicie inválido con campos vacíos', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('');
      component.loginForm.get('password')?.setValue('');
      expect(component.loginForm.invalid).toBeTrue();
    });
  });

  describe('cuentas recordadas (legado)', () => {
    // Versiones anteriores guardaban usuario y clave en texto plano en localStorage.
    // Ahora el gestor de contraseñas del navegador se encarga, y el login borra lo antiguo.
    it('borra las cuentas guardadas en texto plano al inicializar', () => {
      localStorage.setItem('dipalza_remembered_accounts', JSON.stringify([{ username: 'juan', password: 'clave123' }]));

      component.ngOnInit();

      expect(localStorage.getItem('dipalza_remembered_accounts')).toBeNull();
    });
  });

  describe('onSubmit', () => {
    it('con el formulario inválido no llama al backend y marca submitted para mostrar los errores por campo', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('');
      component.loginForm.get('password')?.setValue('');
      component.onSubmit();
      expect(authServiceMock.login).not.toHaveBeenCalled();
      expect(component.submitted).toBeTrue();
      expect(component.cargando).toBeFalse();
    });

    it('activa cargando mientras la petición está en curso', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('testuser');
      component.loginForm.get('password')?.setValue('testpass');
      const respuesta = new Subject<any>();
      authServiceMock.login.and.returnValue(respuesta.asObservable());

      component.onSubmit();
      expect(component.cargando).toBeTrue();

      respuesta.error({ status: 500, message: 'Error interno' });
      expect(component.cargando).toBeFalse();
    });

    it('debería llamar authService.login con credenciales válidas', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('testuser');
      component.loginForm.get('password')?.setValue('testpass');
      authServiceMock.login.and.returnValue(of({ token: 'xyz' }));
      component.onSubmit();
      expect(authServiceMock.login).toHaveBeenCalledWith('testuser', 'testpass');
    });

    it('debería mostrar error en credenciales inválidas (status 403)', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('testuser');
      component.loginForm.get('password')?.setValue('testpass');
      authServiceMock.login.and.returnValue(
        throwError(() => ({ status: 403, message: 'Forbidden' }))
      );
      component.onSubmit();
      expect(component.error).toBe('Usuario no autorizado!!');
    });

    it('debería mostrar error genérico en otro tipo de error', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('testuser');
      component.loginForm.get('password')?.setValue('testpass');
      authServiceMock.login.and.returnValue(
        throwError(() => ({ status: 500, message: 'Error interno' }))
      );
      component.onSubmit();
      expect(component.error).toBe('Error interno');
    });

    it('debería navegar a raíz tras login exitoso', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('testuser');
      component.loginForm.get('password')?.setValue('testpass');
      authServiceMock.login.and.returnValue(of({ token: 'xyz' }));
      component.onSubmit();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    });

    it('debería mostrar error si token viene vacío', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('testuser');
      component.loginForm.get('password')?.setValue('testpass');
      authServiceMock.login.and.returnValue(of(null));
      authServiceMock.currentUserValue = { token: '' };
      component.onSubmit();
      expect(component.error).toBe('Usuario inválido');
    });

    it('debería resetear submitted=false tras error', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('testuser');
      component.loginForm.get('password')?.setValue('testpass');
      authServiceMock.login.and.returnValue(
        throwError(() => ({ status: 500 }))
      );
      expect(component.submitted).toBeFalse();
      component.onSubmit();
      expect(component.submitted).toBeFalse();
    });
  });

  describe('get f', () => {
    it('debería retornar controles del formulario', () => {
      component.ngOnInit();
      expect(component.f).toBe(component.loginForm.controls);
    });
  });

  describe('onSubmit con mustChangePassword', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('jperez');
      component.loginForm.get('password')?.setValue('claveTemp123');
    });

    it('navega a home si mustChangePassword es false', () => {
      component.onSubmit();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
      expect(ngbModalMock.open).not.toHaveBeenCalled();
    });

    it('abre el diálogo bloqueante si mustChangePassword es true, sin navegar', () => {
      authServiceMock.login.and.returnValue(of({ token: 'test-token', mustChangePassword: true }));
      authServiceMock.currentUserValue = { token: 'test-token', mustChangePassword: true };

      component.onSubmit();

      expect(ngbModalMock.open).toHaveBeenCalledWith(
        CambiarClaveObligatorioComponent,
        jasmine.objectContaining({ backdrop: 'static', keyboard: false }),
      );
      expect(routerMock.navigate).not.toHaveBeenCalledWith(['/']);
    });

    it('pasa la clave recién escrita al diálogo', () => {
      authServiceMock.login.and.returnValue(of({ token: 'test-token', mustChangePassword: true }));
      authServiceMock.currentUserValue = { token: 'test-token', mustChangePassword: true };
      const modalRef = { componentInstance: {} as any, closed: of(undefined) };
      ngbModalMock.open.and.returnValue(modalRef);

      component.onSubmit();

      expect(modalRef.componentInstance.claveActualForzada).toBe('claveTemp123');
    });

    it('resetea submitted y cargando cuando se cierra el diálogo (el botón Ingresar no debe quedar deshabilitado)', () => {
      authServiceMock.login.and.returnValue(of({ token: 'test-token', mustChangePassword: true }));
      authServiceMock.currentUserValue = { token: 'test-token', mustChangePassword: true };
      const modalRef = { componentInstance: {} as any, closed: of(undefined) };
      ngbModalMock.open.and.returnValue(modalRef);

      component.onSubmit();

      expect(component.submitted).toBeFalse();
      expect(component.cargando).toBeFalse();
    });

    it('no carga productos si mustChangePassword es true', () => {
      authServiceMock.login.and.returnValue(of({ token: 'test-token', mustChangePassword: true }));
      authServiceMock.currentUserValue = { token: 'test-token', mustChangePassword: true };

      component.onSubmit();

      expect(productoServiceMock.loadProductos).not.toHaveBeenCalled();
    });
  });
});