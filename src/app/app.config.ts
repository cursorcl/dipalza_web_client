import { ApplicationConfig, importProvidersFrom, provideAppInitializer, inject, LOCALE_ID } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi, HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HashLocationStrategy, LocationStrategy, registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import { firstValueFrom } from 'rxjs';

// Rutas y Servicios
import { APP_ROUTE } from './app.routes';
import { JwtInterceptor } from '@core/interceptor/jwt.interceptor';
import { DirectionService, LanguageService } from '@core';
import { ProductoService } from './services/producto.service';

// Traducciones
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// Otros
import { FeatherModule } from 'angular-feather';
import { allIcons } from 'angular-feather/icons';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

// Sin esto los pipes currency/number/date usan en-US (coma como separador de miles).
registerLocaleData(localeEsCl);

export const appConfig: ApplicationConfig = {
    providers: [
        { provide: LOCALE_ID, useValue: 'es-CL' },
        provideHttpClient(withInterceptorsFromDi()),
        provideRouter(APP_ROUTE),
        provideAnimations(),

        { provide: LocationStrategy, useClass: HashLocationStrategy },
        { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },



        DirectionService,
        LanguageService,

        importProvidersFrom(
            TranslateModule.forRoot({
                defaultLanguage: 'en',
                loader: {
                    provide: TranslateLoader,
                    useFactory: (http: HttpClient) => new TranslateHttpLoader(http, './assets/i18n/', '.json'),
                    deps: [HttpClient],
                },
            }),
            FeatherModule.pick(allIcons)
        ),

        provideCharts(withDefaultRegisterables()),
    ],
};