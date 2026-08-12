import { ComponentFixture, TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '@core';
import { FeatherModule } from 'angular-feather';
import { allIcons } from 'angular-feather/icons';
import { SidebarComponent } from './sidebar.component';
import { RouteInfo } from './sidebar.metadata';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<Partial<AuthService>>;

  const routes: RouteInfo[] = [
    { path: 'ventas', title: 'Ventas', iconType: 'feather', icon: 'home', class: '', groupTitle: false, badge: '', badgeClass: '', submenu: [] },
    { path: 'usuarios', title: 'Gestionar Usuarios', iconType: 'feather', icon: 'users', class: '', groupTitle: false, badge: '', badgeClass: '', submenu: [] }
  ];

  function setup(isAdmin: boolean) {
    authServiceSpy = {
      isAdmin: jasmine.createSpy('isAdmin').and.returnValue(isAdmin),
      currentUserValue: { username: 'jperez' } as any
    };

    TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        importProvidersFrom(FeatherModule.pick(allIcons))
      ]
    });

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne('assets/data/routes.json').flush({ routes });
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('incluye "Gestionar Usuarios" cuando el usuario es admin', () => {
    setup(true);
    expect(component.sidebarItems.some(r => r.path === 'usuarios')).toBeTrue();
  });

  it('excluye "Gestionar Usuarios" cuando el usuario no es admin', () => {
    setup(false);
    expect(component.sidebarItems.some(r => r.path === 'usuarios')).toBeFalse();
    expect(component.sidebarItems.some(r => r.path === 'ventas')).toBeTrue();
  });
});
