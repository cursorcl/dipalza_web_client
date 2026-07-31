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

  it('aplica la clase de fila seleccionada cuando selectedId coincide con la clave del vendedor', () => {
    component.vendedores = [vendedorEjemplo];
    component.selectedId = '001_0';
    fixture.detectChanges();

    const fila: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__item');
    expect(fila.classList.contains('vendor-list__item--selected')).toBeTrue();
  });

  it('no aplica la clase de fila seleccionada cuando selectedId es distinto', () => {
    component.vendedores = [vendedorEjemplo];
    component.selectedId = null;
    fixture.detectChanges();

    const fila: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__item');
    expect(fila.classList.contains('vendor-list__item--selected')).toBeFalse();
  });

  it('emite trayectoriaToggled con el vendedor completo al hacer clic en la fila', () => {
    component.vendedores = [vendedorEjemplo];
    fixture.detectChanges();

    const emitidos: VendedorListItem[] = [];
    component.trayectoriaToggled.subscribe((v) => emitidos.push(v));

    const fila: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__item');
    fila.dispatchEvent(new Event('click'));

    expect(emitidos).toEqual([vendedorEjemplo]);
  });

  it('el panel inicia expandido: el cuerpo con la lista es visible', () => {
    component.vendedores = [vendedorEjemplo];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.vendor-list__body')).toBeTruthy();
    expect(component.colapsado()).toBeFalse();
  });

  it('al hacer clic en el encabezado, colapsa y oculta el cuerpo de la lista', () => {
    component.vendedores = [vendedorEjemplo];
    fixture.detectChanges();

    const header: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__header');
    header.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(component.colapsado()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.vendor-list__body')).toBeNull();
  });

  it('un segundo clic en el encabezado vuelve a expandir el panel', () => {
    component.vendedores = [vendedorEjemplo];
    fixture.detectChanges();

    const header: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__header');
    header.dispatchEvent(new Event('click'));
    header.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(component.colapsado()).toBeFalse();
    expect(fixture.nativeElement.querySelector('.vendor-list__body')).toBeTruthy();
  });
});
