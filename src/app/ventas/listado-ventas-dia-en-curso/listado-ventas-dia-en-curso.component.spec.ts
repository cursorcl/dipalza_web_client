import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListadoVentasDiaEnCursoComponent } from './listado-ventas-dia-en-curso.component';

describe('ListadoVentasDiaComponent', () => {
  let component: ListadoVentasDiaEnCursoComponent;
  let fixture: ComponentFixture<ListadoVentasDiaEnCursoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoVentasDiaEnCursoComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ListadoVentasDiaEnCursoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
