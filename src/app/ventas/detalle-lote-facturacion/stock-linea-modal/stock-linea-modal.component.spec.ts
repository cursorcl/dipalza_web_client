import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { StockLineaModalComponent } from './stock-linea-modal.component';
import { ItemComparado } from '../../models/model';

describe('StockLineaModalComponent', () => {
  let fixture: ComponentFixture<StockLineaModalComponent>;
  let component: StockLineaModalComponent;

  const itemConStock: ItemComparado = {
    codigoProducto: 'ART1', nroLinea: 1,
    precioVentaNetoEsperado: 100, cantidadAsignadaEsperada: 5,
    valorTotalVentaNetaEsperado: 500, valorTotalIvaEsperado: 95,
    valorTotalIlaEsperado: 0, valorTotalDescuentoEsperado: 0, error: null,
    precioVentaReal: 100, totalLineaReal: 500, precioCostoReal: 60,
    numerosAsignados: ['01', '02'],
    cantidadReal: 5, esNumerado: true, stockAntes: 50, stockDespues: 45
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockLineaModalComponent],
      providers: [NgbActiveModal]
    }).compileComponents();

    fixture = TestBed.createComponent(StockLineaModalComponent);
    component = fixture.componentInstance;
    component.item = itemConStock;
    fixture.detectChanges();
  });

  it('muestra el stock antes y despues de la linea', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('50');
    expect(texto).toContain('45');
  });

  it('muestra "sin dato" cuando la linea no tiene stock (p.ej. conduccion o lote antiguo)', () => {
    component.item = { ...itemConStock, stockAntes: null, stockDespues: null };
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto.toLowerCase()).toContain('sin dato');
  });
});
