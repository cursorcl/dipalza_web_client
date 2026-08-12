import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

function fakeJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.firma-invalida`;
}

describe('AuthService.isAdmin', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('retorna false si no hay usuario logueado', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    expect(service.isAdmin()).toBeFalse();
  });

  it('retorna false si el token no tiene ROLE_ADMIN entre los roles', () => {
    const token = fakeJwt({ roles: ['ROLE_VENDEDOR'] });
    localStorage.setItem('currentUser', JSON.stringify({ token }));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    expect(service.isAdmin()).toBeFalse();
  });

  it('retorna true si el token tiene ROLE_ADMIN entre los roles', () => {
    const token = fakeJwt({ roles: ['ROLE_ADMIN', 'ROLE_VENDEDOR'] });
    localStorage.setItem('currentUser', JSON.stringify({ token }));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    expect(service.isAdmin()).toBeTrue();
  });

  it('retorna false si el token está mal formado', () => {
    localStorage.setItem('currentUser', JSON.stringify({ token: 'no-es-un-jwt' }));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    expect(service.isAdmin()).toBeFalse();
  });
});
