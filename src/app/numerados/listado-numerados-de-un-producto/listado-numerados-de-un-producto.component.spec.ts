import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ListadoNumeradosDeUnProductoComponent } from './listado-numerados-de-un-producto.component';

describe('ListadoNumeradosDeUnProductoComponent', () => {
  let component: ListadoNumeradosDeUnProductoComponent;
  let fixture: ComponentFixture<ListadoNumeradosDeUnProductoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoNumeradosDeUnProductoComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
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
