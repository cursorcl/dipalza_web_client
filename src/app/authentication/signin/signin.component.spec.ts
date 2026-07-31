/// <reference types="jasmine" />
import { UntypedFormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, RememberedAccountsService } from '@core';
import { of, throwError } from 'rxjs';
import { SigninComponent } from './signin.component';
import { ProductoService } from 'app/services/producto.service';

describe('SigninComponent', () => {
  let component: SigninComponent;
  let formBuilder: UntypedFormBuilder;
  let authServiceMock: any;
  let routerMock: any;
  let productoServiceMock: any;
  let rememberedAccountsServiceMock: any;

  beforeEach(() => {
    authServiceMock = {
      login: jasmine.createSpy('login').and.returnValue(of({ token: 'test-token' })),
      currentUserValue: { token: 'test-token' }
    };

    routerMock = {
      navigate: jasmine.createSpy('navigate')
    };

    productoServiceMock = {
      loadProductos: jasmine.createSpy('loadProductos').and.returnValue(of([]))
    };

    rememberedAccountsServiceMock = {
      getAccounts: jasmine.createSpy('getAccounts').and.returnValue([]),
      saveAccount: jasmine.createSpy('saveAccount')
    };

    formBuilder = new UntypedFormBuilder();

    component = new SigninComponent(
      formBuilder,
      routerMock,
      authServiceMock as AuthService,
      productoServiceMock as ProductoService,
      rememberedAccountsServiceMock as RememberedAccountsService
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
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

  describe('cuentas recordadas', () => {
    it('debería exponer las cuentas guardadas al inicializar', () => {
      rememberedAccountsServiceMock.getAccounts.and.returnValue([
        { username: 'juan', password: 'clave123' },
      ]);
      component.ngOnInit();
      expect(component.accounts).toEqual([{ username: 'juan', password: 'clave123' }]);
    });

    it('onAccountSelected debería precargar usuario y clave de la cuenta elegida', () => {
      rememberedAccountsServiceMock.getAccounts.and.returnValue([
        { username: 'juan', password: 'clave123' },
      ]);
      component.ngOnInit();
      component.onAccountSelected('juan');
      expect(component.loginForm.get('username')?.value).toBe('juan');
      expect(component.loginForm.get('password')?.value).toBe('clave123');
    });

    it('onAccountSelected no debería modificar el formulario si el username no existe', () => {
      component.ngOnInit();
      component.loginForm.setValue({ username: 'x', password: 'y', remember: '' });
      component.onAccountSelected('inexistente');
      expect(component.loginForm.get('username')?.value).toBe('x');
      expect(component.loginForm.get('password')?.value).toBe('y');
    });
  });

  describe('onSubmit', () => {
    it('debería mostrar error si formulario es inválido', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('');
      component.loginForm.get('password')?.setValue('');
      component.onSubmit();
      expect(component.error).toBe('Usuario y/o clave inválidos !');
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

    it('debería guardar la cuenta si "recordarme" está marcado tras login exitoso', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('testuser');
      component.loginForm.get('password')?.setValue('testpass');
      component.loginForm.get('remember')?.setValue(true);
      component.onSubmit();
      expect(rememberedAccountsServiceMock.saveAccount).toHaveBeenCalledWith('testuser', 'testpass');
    });

    it('no debería guardar la cuenta si "recordarme" no está marcado', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('testuser');
      component.loginForm.get('password')?.setValue('testpass');
      component.loginForm.get('remember')?.setValue(false);
      component.onSubmit();
      expect(rememberedAccountsServiceMock.saveAccount).not.toHaveBeenCalled();
    });
  });

  describe('get f', () => {
    it('debería retornar controles del formulario', () => {
      component.ngOnInit();
      expect(component.f).toBe(component.loginForm.controls);
    });
  });
});