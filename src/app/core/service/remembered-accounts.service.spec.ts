/// <reference types="jasmine" />
import { RememberedAccountsService } from './remembered-accounts.service';

describe('RememberedAccountsService', () => {
  let service: RememberedAccountsService;

  beforeEach(() => {
    localStorage.clear();
    service = new RememberedAccountsService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debería retornar una lista vacía si no hay nada guardado', () => {
    expect(service.getAccounts()).toEqual([]);
  });

  it('debería retornar una lista vacía si el valor guardado es JSON inválido', () => {
    localStorage.setItem('dipalza_remembered_accounts', 'no-es-json');
    expect(service.getAccounts()).toEqual([]);
  });

  it('debería guardar una cuenta nueva', () => {
    service.saveAccount('juan', 'clave123');
    expect(service.getAccounts()).toEqual([{ username: 'juan', password: 'clave123' }]);
  });

  it('debería mover una cuenta existente al frente y actualizar su clave', () => {
    service.saveAccount('juan', 'clave123');
    service.saveAccount('maria', 'otraClave');
    service.saveAccount('juan', 'claveNueva');

    expect(service.getAccounts()).toEqual([
      { username: 'juan', password: 'claveNueva' },
      { username: 'maria', password: 'otraClave' },
    ]);
  });

  it('debería mantener como máximo 5 cuentas, descartando la más antigua', () => {
    service.saveAccount('user1', 'p1');
    service.saveAccount('user2', 'p2');
    service.saveAccount('user3', 'p3');
    service.saveAccount('user4', 'p4');
    service.saveAccount('user5', 'p5');
    service.saveAccount('user6', 'p6');

    const accounts = service.getAccounts();
    expect(accounts.length).toBe(5);
    expect(accounts.map(a => a.username)).toEqual(['user6', 'user5', 'user4', 'user3', 'user2']);
    expect(accounts.find(a => a.username === 'user1')).toBeUndefined();
  });
});
