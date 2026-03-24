import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListadoDetalleVentasDiaComponent } from './listado-detalle-ventas-dia.component';

describe('ListadoDetalleVentasDiaComponent', () => {
  let component: ListadoDetalleVentasDiaComponent;
  let fixture: ComponentFixture<ListadoDetalleVentasDiaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoDetalleVentasDiaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListadoDetalleVentasDiaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
