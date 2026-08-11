import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from 'environments/environment';
import Swal from 'sweetalert2';

import { GestionProductosNumeradosComponent } from './gestion-productos-numerados.component';
import { Producto, ProductoElegibleNumerado } from 'app/ventas/models/model';

describe('GestionProductosNumeradosComponent', () => {
  let component: GestionProductosNumeradosComponent;
  let fixture: ComponentFixture<GestionProductosNumeradosComponent>;
  let httpMock: HttpTestingController;

  const productoElegible: ProductoElegibleNumerado = {
    codigoProducto: 'ART001',
    nombreProducto: 'Queso',
    stock: 50,
    piezas: 3,
    tieneRegistrosAsociados: false
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionProductosNumeradosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), NgbActiveModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionProductosNumeradosComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/numerados/productos-elegibles`).flush([productoElegible]);
    httpMock.expectOne(`${environment.apiUrl}/productos`).flush([]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carga los productos elegibles al iniciar', () => {
    expect(component.rows).toEqual([productoElegible]);
  });

  it('no permite quitar un producto con registros asociados (no llama al backend)', () => {
    const conRegistros: ProductoElegibleNumerado = { ...productoElegible, tieneRegistrosAsociados: true };

    component.quitarProducto(conRegistros);

    httpMock.expectNone(`${environment.apiUrl}/numerados/productos-elegibles/${conRegistros.codigoProducto}`);
  });

  it('agrega el producto seleccionado y refresca ambas listas', () => {
    const producto: Producto = { articulo: 'ART002', descripcion: 'Jamón', numbered: false } as unknown as Producto;
    component.productoSeleccionado = producto;

    component.agregarProducto();

    const req = httpMock.expectOne(`${environment.apiUrl}/numerados/productos-elegibles/ART002`);
    expect(req.request.method).toBe('PUT');
    req.flush(null);

    httpMock.expectOne(`${environment.apiUrl}/numerados/productos-elegibles`).flush([productoElegible]);
    httpMock.expectOne(`${environment.apiUrl}/productos`).flush([]);

    expect(component.productoSeleccionado).toBeNull();
  });

  it('quita un producto confirmado y refresca ambas listas', () => {
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);

    component.quitarProducto(productoElegible);

    return fixture.whenStable().then(() => {
      const req = httpMock.expectOne(`${environment.apiUrl}/numerados/productos-elegibles/${productoElegible.codigoProducto}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      httpMock.expectOne(`${environment.apiUrl}/numerados/productos-elegibles`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/productos`).flush([]);
    });
  });

  it('no quita el producto si el usuario cancela la confirmación', () => {
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: false } as any);

    component.quitarProducto(productoElegible);

    return fixture.whenStable().then(() => {
      httpMock.expectNone(`${environment.apiUrl}/numerados/productos-elegibles/${productoElegible.codigoProducto}`);
    });
  });

  it('muestra el mensaje de error del backend si falla el DELETE', () => {
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);

    component.quitarProducto(productoElegible);

    return fixture.whenStable().then(() => {
      const req = httpMock.expectOne(`${environment.apiUrl}/numerados/productos-elegibles/${productoElegible.codigoProducto}`);
      req.flush({ message: 'No se puede quitar: el producto tiene numerados asociados' }, { status: 400, statusText: 'Bad Request' });

      expect(component.error).toBe('No se puede quitar: el producto tiene numerados asociados');
    });
  });

  it('muestra un mensaje genérico si falla el PUT sin body de error', () => {
    const producto: Producto = { articulo: 'ART003', descripcion: 'Salame' } as unknown as Producto;
    component.productoSeleccionado = producto;

    component.agregarProducto();

    const req = httpMock.expectOne(`${environment.apiUrl}/numerados/productos-elegibles/ART003`);
    req.flush('error', { status: 500, statusText: 'Server Error' });

    expect(component.error).toBe('No se pudo agregar el producto a la lista de numerados.');
  });
});
