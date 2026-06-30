import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListadoNumeradosDeUnProductoComponent } from './listado-numerados-de-un-producto.component';

describe('ListadoNumeradosDeUnProductoComponent', () => {
  let component: ListadoNumeradosDeUnProductoComponent;
  let fixture: ComponentFixture<ListadoNumeradosDeUnProductoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoNumeradosDeUnProductoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListadoNumeradosDeUnProductoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
