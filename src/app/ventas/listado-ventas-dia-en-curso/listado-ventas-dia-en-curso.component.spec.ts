import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ListadoVentasDiaEnCursoComponent } from './listado-ventas-dia-en-curso.component';

describe('ListadoVentasDiaEnCursoComponent', () => {
  let component: ListadoVentasDiaEnCursoComponent;
  let fixture: ComponentFixture<ListadoVentasDiaEnCursoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoVentasDiaEnCursoComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
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
