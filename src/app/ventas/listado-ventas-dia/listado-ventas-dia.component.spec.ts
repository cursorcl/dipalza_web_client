import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListadoVentasDiaComponent } from './listado-ventas-dia.component';

describe('ListadoVentasDiaComponent', () => {
  let component: ListadoVentasDiaComponent;
  let fixture: ComponentFixture<ListadoVentasDiaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoVentasDiaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListadoVentasDiaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
