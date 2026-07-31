import { Injectable } from '@angular/core';

export interface RememberedAccount {
  username: string;
  password: string;
}

const STORAGE_KEY = 'dipalza_remembered_accounts';
const MAX_ACCOUNTS = 5;

@Injectable({
  providedIn: 'root',
})
export class RememberedAccountsService {
  getAccounts(): RememberedAccount[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveAccount(username: string, password: string): void {
    const accounts = this.getAccounts().filter(a => a.username !== username);
    accounts.unshift({ username, password });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.slice(0, MAX_ACCOUNTS)));
  }
}
