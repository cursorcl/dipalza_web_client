import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from 'environments/environment';

import { EdicionNumeradosComponent } from './edicion-numerados.component';
import { Numerado, Producto } from 'app/ventas/models/model';

describe('EdicionNumeradosComponent', () => {
  let component: EdicionNumeradosComponent;
  let fixture: ComponentFixture<EdicionNumeradosComponent>;
  let httpMock: HttpTestingController;

  const producto: Producto = { articulo: 'ART001', descripcion: 'Queso', numbered: true } as unknown as Producto;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EdicionNumeradosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), NgbActiveModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EdicionNumeradosComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('arranca en modo alta cuando no hay numerado en edición', () => {
    fixture.detectChanges();
    expect(component.esEdicion).toBeFalse();
  });

  it('en modo alta, el campo "número" queda habilitado (editable, no de solo lectura)', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/productos`).flush([producto]);
    expect(component.form.get('numero')?.enabled).toBeTrue();
  });

  it('Enter en "número" no envía el formulario, solo pasa el foco a "peso"', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/productos`).flush([]);

    const preventDefault = jasmine.createSpy('preventDefault');
    const focusSpy = spyOn(component.pesoInputRef!.nativeElement, 'focus');

    component.irAPeso({ preventDefault } as unknown as Event);

    expect(preventDefault).toHaveBeenCalled();
    expect(focusSpy).toHaveBeenCalled();
  });

  it('Enter en "peso" no depende del submit implícito del form -- llama a submit() directamente', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/productos`).flush([]);

    const preventDefault = jasmine.createSpy('preventDefault');
    const submitSpy = spyOn(component, 'submit');

    component.confirmarPeso({ preventDefault } as unknown as Event);

    expect(preventDefault).toHaveBeenCalled();
    expect(submitSpy).toHaveBeenCalled();
  });

  it('tras un alta exitosa, no cierra el diálogo y prepara el siguiente numerado del mismo producto', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/productos`).flush([producto]);

    component.form.get('producto')?.setValue(producto);
    httpMock.expectOne(req => req.url.endsWith('/numerados/byProduct')).flush([]);
    expect(component.form.get('numero')?.value).toBe(1);

    component.form.get('peso')?.setValue(2.5);
    const closeSpy = spyOn(component.activeModal, 'close');

    component.submit();
    const postReq = httpMock.expectOne(`${environment.apiUrl}/numerados`);
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ id: 1, codigoProducto: 'ART001', numero: 1, peso: 2.5, estado: 'D' });

    httpMock.expectOne(req => req.url.endsWith('/numerados/byProduct'))
      .flush([{ id: 1, codigoProducto: 'ART001', nombreProducto: 'Queso', numero: 1, peso: 2.5, estado: 'D', creadoEn: '', actualizadoEn: '' }]);

    expect(closeSpy).not.toHaveBeenCalled();
    expect(component.guardadosCount).toBe(1);
    expect(component.form.get('peso')?.value).toBeNull();
    expect(component.form.get('numero')?.value).toBe(2);
  });

  it('tras un alta exitosa, el foco vuelve a "número" (no a "peso") para encadenar el siguiente ingreso', fakeAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/productos`).flush([producto]);

    component.form.get('producto')?.setValue(producto);
    httpMock.expectOne(req => req.url.endsWith('/numerados/byProduct')).flush([]);

    component.form.get('peso')?.setValue(2.5);
    const focusSpy = spyOn(component.numeroInputRef!.nativeElement, 'focus');
    const selectSpy = spyOn(component.numeroInputRef!.nativeElement, 'select');

    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/numerados`)
      .flush({ id: 1, codigoProducto: 'ART001', numero: 1, peso: 2.5, estado: 'D' });
    httpMock.expectOne(req => req.url.endsWith('/numerados/byProduct')).flush([]);

    tick();

    expect(focusSpy).toHaveBeenCalled();
    expect(selectSpy).toHaveBeenCalled();
  }));

  it('tras editar, cierra el diálogo con close(true)', () => {
    const numeradoEnEdicion: Numerado = {
      id: 5, codigoProducto: 'ART001', nombreProducto: 'Queso', numero: 1, peso: 1.5, estado: 'D', creadoEn: '', actualizadoEn: ''
    };
    component.numeradoEnEdicion = numeradoEnEdicion;
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/productos`).flush([producto]);

    const closeSpy = spyOn(component.activeModal, 'close');

    component.submit();
    const putReq = httpMock.expectOne(`${environment.apiUrl}/numerados`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ id: 5, codigoProducto: 'ART001', numero: 1, peso: 1.5, estado: 'D' });

    expect(closeSpy).toHaveBeenCalledWith(true);
  });

  it('cerrar hace dismiss cuando no se guardó nada en la sesión', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/productos`).flush([]);

    const dismissSpy = spyOn(component.activeModal, 'dismiss');
    const closeSpy = spyOn(component.activeModal, 'close');

    component.cerrar();

    expect(dismissSpy).toHaveBeenCalled();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('cerrar hace close(true) cuando ya se guardó al menos un numerado en la sesión', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/productos`).flush([]);
    component.guardadosCount = 1;

    const dismissSpy = spyOn(component.activeModal, 'dismiss');
    const closeSpy = spyOn(component.activeModal, 'close');

    component.cerrar();

    expect(closeSpy).toHaveBeenCalledWith(true);
    expect(dismissSpy).not.toHaveBeenCalled();
  });
});
