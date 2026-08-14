import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../service/auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authServiceMock: { currentUserValue: any };
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authServiceMock = { currentUserValue: null };
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerSpy }
      ]
    });
    guard = TestBed.inject(AuthGuard);
  });

  it('permite el acceso si hay usuario logueado y no debe cambiar la clave', () => {
    authServiceMock.currentUserValue = { username: 'jperez', mustChangePassword: false };
    expect(guard.canActivate({} as any, {} as any)).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('redirige a signin si no hay usuario logueado', () => {
    authServiceMock.currentUserValue = null;
    expect(guard.canActivate({} as any, {} as any)).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/authentication/signin']);
  });

  it('redirige a signin si el usuario debe cambiar la clave (mustChangePassword=true)', () => {
    authServiceMock.currentUserValue = { username: 'jperez', mustChangePassword: true };
    expect(guard.canActivate({} as any, {} as any)).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/authentication/signin']);
  });
});
