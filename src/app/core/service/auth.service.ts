import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, of, tap, throwError } from 'rxjs';
import { User } from '../models/user';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private loginurl = `${environment.authUrl}/weblogin`;
  private refreshTokenUrl = `${environment.authUrl}/webrefresh`;
  private currentUserSubject: BehaviorSubject<User>;
  public currentUser: Observable<User>;


  constructor(private httpClient: HttpClient) {

    this.currentUserSubject = new BehaviorSubject<User>(
      JSON.parse(localStorage.getItem('currentUser') || '{}')
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string) {

    const loginRequest = { username, password };
    return this.httpClient.post<User>(
      this.loginurl,
      loginRequest
    ).pipe(map (user => {

    if (!user) {
      return this.error('Usuario o clave incorrectos');
    } else {
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUserSubject.next(user);
      return user;
    }
    }));
  }
  
  error(message: string) {
    return throwError(message);
  }

  logout() {
    // remove user from local storage to log user out
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(this.currentUserValue);
    return of({ success: false });
  }

  // Método nuevo para refrescar
refreshToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  // Envías el refresh token al backend
  return this.httpClient.post<any>(`${this.refreshTokenUrl}`, { refreshToken })
    .pipe(tap(response => {
      // Al recibir los nuevos tokens, los guardamos
      this.storeTokens(response);
    }));
}

private storeTokens(data: any) {
  localStorage.setItem('token', data.token);
  localStorage.setItem('refreshToken', data.refreshToken);
  const updatedUser = { ...this.currentUserValue, token: data.token };
  localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  this.currentUserSubject.next(updatedUser);
}

getToken() {
  return this.currentUserValue.token;
}
}

