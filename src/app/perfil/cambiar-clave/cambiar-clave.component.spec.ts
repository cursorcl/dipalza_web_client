/// <reference types="jasmine" />
import { UntypedFormBuilder } from '@angular/forms';
import { AuthService } from '@core';
import { of, throwError } from 'rxjs';
import { CambiarClaveComponent } from './cambiar-clave.component';

describe('CambiarClaveComponent', () => {
  let component: CambiarClaveComponent;
  let formBuilder: UntypedFormBuilder;
  let authServiceMock: any;

  beforeEach(() => {
    authServiceMock = {
      changePassword: jasmine.createSpy('changePassword').and.returnValue(of(undefined)),
    };
    formBuilder = new UntypedFormBuilder();
    component = new CambiarClaveComponent(formBuilder, authServiceMock as AuthService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function llenarFormularioValido() {
    component.form.setValue({
      claveActual: 'claveVieja',
      claveNueva: 'claveNueva1',
      confirmarClave: 'claveNueva1',
    });
  }

  describe('onSubmit', () => {
    it('no llama al servicio si el formulario es inválido', () => {
      component.onSubmit();
      expect(authServiceMock.changePassword).not.toHaveBeenCalled();
    });

    it('no llama al servicio si las claves nuevas no coinciden', () => {
      component.form.setValue({
        claveActual: 'claveVieja',
        claveNueva: 'claveNueva1',
        confirmarClave: 'otraClave1',
      });
      component.onSubmit();
      expect(authServiceMock.changePassword).not.toHaveBeenCalled();
    });

    it('muestra un mensaje de éxito y limpia el formulario', () => {
      llenarFormularioValido();
      component.onSubmit();
      expect(authServiceMock.changePassword).toHaveBeenCalledWith('claveVieja', 'claveNueva1');
      expect(component.success).toBe('Contraseña actualizada correctamente.');
    });

    it('muestra el mensaje de clave incorrecta en un error 401', () => {
      authServiceMock.changePassword.and.returnValue(throwError(() => ({ status: 401 })));
      llenarFormularioValido();
      component.onSubmit();
      expect(component.error).toBe('La clave actual es incorrecta.');
    });

    it('muestra un mensaje genérico en otros errores', () => {
      authServiceMock.changePassword.and.returnValue(throwError(() => ({ status: 500 })));
      llenarFormularioValido();
      component.onSubmit();
      expect(component.error).toBe('No se pudo cambiar la clave. Intente nuevamente.');
    });
  });
});
