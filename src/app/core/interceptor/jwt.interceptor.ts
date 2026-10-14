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

            // 401 (token vencido/inválido) y 403 (ej. el propio access token vencido,
            // que este backend también puede responder como 403 según el endpoint) se
            // tratan igual: se intenta renovar el token antes de forzar logout. Una
            // operación larga (como facturar muchas líneas) puede cruzar la expiración
            // del access token sin que el usuario haya hecho nada mal -- no corresponde
            // expulsarlo sin intentar primero una renovación silenciosa.
            // Nunca reintentar sobre el propio endpoint de refresh ni el de login: si el
            // refresh token también venció, esto forzaría logout igual más abajo en
            // handleTokenRefresh, pero sin esta exclusión la misma request de refresh
            // volvería a pasar por este interceptor y se quedaría esperando un token que
            // nunca llega (isRefreshing ya está en true).
            if ((error.status === 401 || error.status === 403)
                    && !request.url.includes('authentication/signin')
                    && !request.url.includes('webrefresh')) {
                return this.handleTokenRefresh(authReq, next);
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

  private handleTokenRefresh(request: HttpRequest<any>, next: HttpHandler) {
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