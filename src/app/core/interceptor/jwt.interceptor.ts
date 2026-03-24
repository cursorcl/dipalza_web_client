// jwt.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap, finalize } from 'rxjs/operators'; // Agregué finalize por si acaso
import { AuthService } from '@core/service/auth.service';
import { Router } from '@angular/router'; // Necesitas el Router para redirigir

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService, private router: Router) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let authReq = request;
    const token = this.authService.getToken();
    if (token) {
      authReq = this.addToken(request, token);
    }

    return next.handle(authReq).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse) {
            
            // CASO 1: 401 Unauthorized -> Intentamos refrescar token
            if (error.status === 401 && !request.url.includes('authentication/signin')) {
                return this.handle401Error(authReq, next);
            }

            // CASO 2: 403 Forbidden -> EL SERVIDOR RECHAZA (Tu caso actual)
            // Aquí asumimos que si da 403, el token es inválido o el servidor se reinició
            // y perdió la sesión. No intentamos refrescar.
            if (error.status === 403) {
                this.forceLogout();
                return throwError(() => error);
            }
        }
        
        return throwError(() => error);
      })
    );
  }

  // Método auxiliar para limpiar y redirigir limpiamente
  private forceLogout() {
    // Evitamos bucles si ya estamos en el login
    if (!this.router.url.includes('/signin')) {
        // Asumo que tu authService.logout() limpia el localStorage
        this.authService.logout(); 
        // Forzamos la navegación por si el logout no lo hace
        this.router.navigate(['/authentication/signin']); 
    }
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((tokenResponse: any) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(tokenResponse.token);
          return next.handle(this.addToken(request, tokenResponse.token));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          // Si el refresh falla, también sacamos al usuario
          this.forceLogout(); 
          return throwError(() => err);
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(jwt => {
          return next.handle(this.addToken(request, jwt));
        })
      );
    }
  }

  private addToken(request: HttpRequest<any>, token: string) {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
}