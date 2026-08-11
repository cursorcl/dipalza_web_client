import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from 'environments/environment';

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
});
