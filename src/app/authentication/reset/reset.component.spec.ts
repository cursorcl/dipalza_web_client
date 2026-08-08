/// <reference types="jasmine" />
import { UntypedFormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core';
import { of, throwError } from 'rxjs';
import { ResetComponent } from './reset.component';

describe('ResetComponent', () => {
  let component: ResetComponent;
  let formBuilder: UntypedFormBuilder;
  let authServiceMock: any;
  let routerMock: any;
  let activatedRouteMock: any;

  function crearComponente(queryParams: Record<string, string> = {}) {
    activatedRouteMock = {
      snapshot: { queryParamMap: { get: (key: string) => queryParams[key] ?? null } },
    };
    component = new ResetComponent(
      formBuilder,
      authServiceMock as AuthService,
      activatedRouteMock as ActivatedRoute,
      routerMock as Router,
    );
  }

  beforeEach(() => {
    authServiceMock = {
      resetPassword: jasmine.createSpy('resetPassword').and.returnValue(of(undefined)),
    };
    routerMock = {
      navigate: jasmine.createSpy('navigate'),
    };
    formBuilder = new UntypedFormBuilder();
    crearComponente();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('prellena el username si viene en el queryParam', () => {
      crearComponente({ username: 'juan' });
      component.ngOnInit();
      expect(component.form.get('username')?.value).toBe('juan');
    });
  });

  function llenarFormularioValido() {
    component.form.setValue({
      username: 'juan',
      codigo: '123456',
      claveNueva: 'claveNueva1',
      confirmarClave: 'claveNueva1',
    });
  }

  describe('onSubmit', () => {
    it('no llama al servicio si el formulario es inválido', () => {
      component.onSubmit();
      expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
    });

    it('no llama al servicio si las claves no coinciden', () => {
      component.form.setValue({
        username: 'juan',
        codigo: '123456',
        claveNueva: 'claveNueva1',
        confirmarClave: 'otraClave1',
      });
      component.onSubmit();
      expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
    });

    it('navega a signin tras restablecer la clave exitosamente', () => {
      llenarFormularioValido();
      component.onSubmit();
      expect(authServiceMock.resetPassword).toHaveBeenCalledWith('juan', '123456', 'claveNueva1');
      expect(routerMock.navigate).toHaveBeenCalledWith(['/authentication/signin']);
    });

    it('muestra el mensaje de código inválido en un error 400', () => {
      authServiceMock.resetPassword.and.returnValue(throwError(() => ({ status: 400 })));
      llenarFormularioValido();
      component.onSubmit();
      expect(component.error).toBe('El código ingresado es inválido o venció.');
    });

    it('muestra un mensaje genérico en otros errores', () => {
      authServiceMock.resetPassword.and.returnValue(throwError(() => ({ status: 500 })));
      llenarFormularioValido();
      component.onSubmit();
      expect(component.error).toBe('No se pudo restablecer la clave. Intente nuevamente.');
    });
  });
});
