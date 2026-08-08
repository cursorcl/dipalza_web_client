/// <reference types="jasmine" />
import { UntypedFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core';
import { of, throwError } from 'rxjs';
import { ForgotComponent } from './forgot.component';

describe('ForgotComponent', () => {
  let component: ForgotComponent;
  let formBuilder: UntypedFormBuilder;
  let authServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    authServiceMock = {
      forgotPassword: jasmine.createSpy('forgotPassword').and.returnValue(of(undefined)),
    };
    routerMock = {
      navigate: jasmine.createSpy('navigate'),
    };
    formBuilder = new UntypedFormBuilder();

    component = new ForgotComponent(formBuilder, authServiceMock as AuthService, routerMock as Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onSubmit', () => {
    it('no llama al servicio si el formulario es inválido', () => {
      component.form.get('usernameOrEmail')?.setValue('');
      component.onSubmit();
      expect(authServiceMock.forgotPassword).not.toHaveBeenCalled();
    });

    it('marca enviado=true tras una respuesta exitosa', () => {
      component.form.get('usernameOrEmail')?.setValue('juan');
      component.onSubmit();
      expect(authServiceMock.forgotPassword).toHaveBeenCalledWith('juan');
      expect(component.enviado).toBeTrue();
    });

    it('marca enviado=true incluso si el backend responde error (no filtra cuentas existentes)', () => {
      authServiceMock.forgotPassword.and.returnValue(throwError(() => ({ status: 500 })));
      component.form.get('usernameOrEmail')?.setValue('juan');
      component.onSubmit();
      expect(component.enviado).toBeTrue();
    });
  });

  describe('irARestablecer', () => {
    it('prellena el username si no es un correo', () => {
      component.form.get('usernameOrEmail')?.setValue('juan');
      component.irARestablecer();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/authentication/reset'], {
        queryParams: { username: 'juan' },
      });
    });

    it('no prellena el username si es un correo', () => {
      component.form.get('usernameOrEmail')?.setValue('juan@test.cl');
      component.irARestablecer();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/authentication/reset'], {
        queryParams: {},
      });
    });
  });
});
