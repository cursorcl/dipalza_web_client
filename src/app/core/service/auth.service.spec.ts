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

  it('decodifica correctamente un payload en base64url (con "-" y "_")', () => {
    // Payload { roles: ['ROLE_ADMIN', 'ROLE_VENDEDOR'], sub: 'jp>>>???///+++' }
    // codificado en base64url -- su equivalente en base64 estándar contiene
    // "+" y "/", que atob() por sí solo no interpreta correctamente.
    const base64UrlPayload = 'eyJyb2xlcyI6WyJST0xFX0FETUlOIiwiUk9MRV9WRU5ERURPUiJdLCJzdWIiOiJqcD4-Pj8_Py8vLysrKyJ9';
    const token = `header.${base64UrlPayload}.firma-invalida`;
    localStorage.setItem('currentUser', JSON.stringify({ token }));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    expect(service.isAdmin()).toBeTrue();
  });
});

describe('AuthService.logout', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('limpia el estado en memoria (currentUserValue queda null) y no solo localStorage', () => {
    localStorage.setItem('currentUser', JSON.stringify({ username: 'jperez', token: 'tok' }));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    expect(service.currentUserValue).toBeTruthy();

    service.logout();

    expect(service.currentUserValue).toBeFalsy();
    expect(localStorage.getItem('currentUser')).toBeNull();
  });

  it('notifica a los suscriptores de currentUser que la sesión terminó', () => {
    localStorage.setItem('currentUser', JSON.stringify({ username: 'jperez', token: 'tok' }));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);

    let ultimoValor: any = 'sin-emitir';
    service.currentUser.subscribe(u => (ultimoValor = u));

    service.logout();

    expect(ultimoValor).toBeFalsy();
  });
});
