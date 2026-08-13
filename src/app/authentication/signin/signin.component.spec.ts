/// <reference types="jasmine" />
import { UntypedFormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, RememberedAccountsService } from '@core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CambiarClaveObligatorioComponent } from 'app/perfil/cambiar-clave-obligatorio/cambiar-clave-obligatorio.component';
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

    rememberedAccountsServiceMock = {
      getAccounts: jasmine.createSpy('getAccounts').and.returnValue([]),
      saveAccount: jasmine.createSpy('saveAccount')
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
      rememberedAccountsServiceMock as RememberedAccountsService,
      ngbModalMock as unknown as NgbModal
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
    beforeEach(() => {
      rememberedAccountsServiceMock.getAccounts.and.returnValue([
        { username: 'juan', password: 'clave123' },
        { username: 'juana', password: 'clave456' },
        { username: 'pedro', password: 'clave789' },
      ]);
      component.ngOnInit();
    });

    it('debería exponer las cuentas guardadas al inicializar', () => {
      expect(component.accounts.length).toBe(3);
    });

    describe('onUsernameFocus', () => {
      it('debería mostrar todas las cuentas si el input está vacío', () => {
        component.onUsernameFocus();
        expect(component.filteredAccounts.length).toBe(3);
        expect(component.showSuggestions).toBeTrue();
      });

      it('debería resetear highlightedIndex a -1', () => {
        component.highlightedIndex = 2;
        component.onUsernameFocus();
        expect(component.highlightedIndex).toBe(-1);
      });
    });

    describe('onUsernameInput', () => {
      it('debería filtrar cuentas por prefijo del username (case-insensitive)', () => {
        component.loginForm.get('username')?.setValue('JU');
        component.onUsernameInput();
        expect(component.filteredAccounts).toEqual([
          { username: 'juan', password: 'clave123' },
          { username: 'juana', password: 'clave456' },
        ]);
        expect(component.showSuggestions).toBeTrue();
      });

      it('debería ocultar la lista si no hay coincidencias', () => {
        component.loginForm.get('username')?.setValue('zzz');
        component.onUsernameInput();
        expect(component.filteredAccounts).toEqual([]);
        expect(component.showSuggestions).toBeFalse();
      });

      it('debería mostrar todas las cuentas si el input queda vacío', () => {
        component.loginForm.get('username')?.setValue('');
        component.onUsernameInput();
        expect(component.filteredAccounts.length).toBe(3);
      });

      it('debería tolerar cuentas con username inválido sin lanzar TypeError', () => {
        component.accounts = [
          { username: 'juan', password: 'clave123' },
          { username: undefined, password: 'clave456' } as any,
          { username: 'pedro', password: 'clave789' },
        ];
        component.loginForm.get('username')?.setValue('j');
        expect(() => component.onUsernameInput()).not.toThrow();
        expect(component.filteredAccounts).toEqual([
          { username: 'juan', password: 'clave123' },
        ]);
      });
    });

    describe('selectAccount', () => {
      it('debería precargar usuario, clave y marcar remember', () => {
        component.selectAccount({ username: 'juan', password: 'clave123' });
        expect(component.loginForm.get('username')?.value).toBe('juan');
        expect(component.loginForm.get('password')?.value).toBe('clave123');
        expect(component.loginForm.get('remember')?.value).toBe(true);
      });

      it('debería cerrar la lista de sugerencias', () => {
        component.showSuggestions = true;
        component.highlightedIndex = 1;
        component.selectAccount({ username: 'juan', password: 'clave123' });
        expect(component.showSuggestions).toBeFalse();
        expect(component.highlightedIndex).toBe(-1);
      });
    });

    describe('onUsernameBlur', () => {
      it('debería cerrar la lista de sugerencias', () => {
        component.showSuggestions = true;
        component.highlightedIndex = 1;
        component.onUsernameBlur();
        expect(component.showSuggestions).toBeFalse();
        expect(component.highlightedIndex).toBe(-1);
      });
    });

    describe('onUsernameKeydown', () => {
      function keyEvent(key: string): KeyboardEvent {
        return new KeyboardEvent('keydown', { key });
      }

      beforeEach(() => {
        component.onUsernameFocus();
      });

      it('ArrowDown debería avanzar highlightedIndex sin pasar del último elemento', () => {
        component.onUsernameKeydown(keyEvent('ArrowDown'));
        expect(component.highlightedIndex).toBe(0);
        component.onUsernameKeydown(keyEvent('ArrowDown'));
        component.onUsernameKeydown(keyEvent('ArrowDown'));
        component.onUsernameKeydown(keyEvent('ArrowDown'));
        expect(component.highlightedIndex).toBe(2);
      });

      it('ArrowUp debería retroceder highlightedIndex sin bajar de 0', () => {
        component.highlightedIndex = 1;
        component.onUsernameKeydown(keyEvent('ArrowUp'));
        expect(component.highlightedIndex).toBe(0);
        component.onUsernameKeydown(keyEvent('ArrowUp'));
        expect(component.highlightedIndex).toBe(0);
      });

      it('Enter con una sugerencia resaltada debería seleccionarla y no enviar el formulario', () => {
        component.highlightedIndex = 1;
        const event = keyEvent('Enter');
        spyOn(event, 'preventDefault');
        component.onUsernameKeydown(event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(component.loginForm.get('username')?.value).toBe('juana');
      });

      it('Enter sin sugerencia resaltada no debería interceptar el evento', () => {
        component.highlightedIndex = -1;
        const event = keyEvent('Enter');
        spyOn(event, 'preventDefault');
        component.onUsernameKeydown(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
      });

      it('Escape debería cerrar la lista sin seleccionar', () => {
        component.highlightedIndex = 1;
        component.onUsernameKeydown(keyEvent('Escape'));
        expect(component.showSuggestions).toBeFalse();
        expect(component.highlightedIndex).toBe(-1);
        expect(component.loginForm.get('username')?.value).toBe('');
      });

      it('no debería hacer nada si showSuggestions es false', () => {
        component.showSuggestions = false;
        component.onUsernameKeydown(keyEvent('ArrowDown'));
        expect(component.highlightedIndex).toBe(-1);
      });
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
  });
});