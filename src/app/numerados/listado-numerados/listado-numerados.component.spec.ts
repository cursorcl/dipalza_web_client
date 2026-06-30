import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListadoNumeradosComponent } from './listado-numerados.component';

describe('ListadoNumeradosComponent', () => {
  let component: ListadoNumeradosComponent;
  let fixture: ComponentFixture<ListadoNumeradosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoNumeradosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListadoNumeradosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
