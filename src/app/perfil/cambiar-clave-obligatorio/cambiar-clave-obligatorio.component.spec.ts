import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from 'environments/environment';

import { CambiarClaveObligatorioComponent } from './cambiar-clave-obligatorio.component';

describe('CambiarClaveObligatorioComponent', () => {
  let component: CambiarClaveObligatorioComponent;
  let fixture: ComponentFixture<CambiarClaveObligatorioComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CambiarClaveObligatorioComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), NgbActiveModal]
    }).compileComponents();

    fixture = TestBed.createComponent(CambiarClaveObligatorioComponent);
    component = fixture.componentInstance;
    component.claveActualForzada = 'ClaveTemp123';
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('guarda la clave nueva usando la clave temporal recibida y cierra el modal', () => {
    component.form.patchValue({ claveNueva: 'claveNueva123', confirmarClave: 'claveNueva123' });
    const closeSpy = spyOn(component.activeModal, 'close');

    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/usuario/cambiar-clave`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ claveActual: 'ClaveTemp123', claveNueva: 'claveNueva123' });
    req.flush(null);

    expect(closeSpy).toHaveBeenCalled();
  });

  it('muestra un mensaje de error si falla el cambio', () => {
    component.form.patchValue({ claveNueva: 'claveNueva123', confirmarClave: 'claveNueva123' });

    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/usuario/cambiar-clave`);
    req.flush({ message: 'error' }, { status: 500, statusText: 'Server Error' });

    expect(component.error).toBe('No se pudo cambiar la clave. Intente nuevamente.');
  });

  it('no permite guardar si las claves no coinciden', () => {
    component.form.patchValue({ claveNueva: 'claveNueva123', confirmarClave: 'otraClave1' });

    component.submit();

    httpMock.expectNone(`${environment.apiUrl}/usuario/cambiar-clave`);
  });
});
