import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VendorListComponent } from './vendor-list.component';
import { VendedorListItem } from '../models/model';

describe('VendorListComponent', () => {
  let component: VendorListComponent;
  let fixture: ComponentFixture<VendorListComponent>;

  const vendedorEjemplo: VendedorListItem = {
    vendedorId: '001',
    vendedorCodigo: '0',
    vendedorNombre: 'Juan Perez',
    color: 'hsl(0, 70%, 50%)',
    fechaHora: new Date().toISOString(),
    tiempoRelativo: '5 segundos',
    online: true
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(VendorListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renderiza una fila por cada vendedor recibido', () => {
    component.vendedores = [vendedorEjemplo];
    fixture.detectChanges();

    const filas = fixture.nativeElement.querySelectorAll('.vendor-list__item');
    expect(filas.length).toBe(1);
    expect(filas[0].textContent).toContain('Juan Perez');
    expect(filas[0].textContent).toContain('5 segundos');
  });

  it('emite vendedorSeleccionado con el vendedorId al hacer doble clic', () => {
    component.vendedores = [vendedorEjemplo];
    fixture.detectChanges();

    const emitidos: string[] = [];
    component.vendedorSeleccionado.subscribe((id) => emitidos.push(id));

    const fila = fixture.nativeElement.querySelector('.vendor-list__item');
    fila.dispatchEvent(new Event('dblclick'));

    expect(emitidos).toEqual(['001']);
  });
});
