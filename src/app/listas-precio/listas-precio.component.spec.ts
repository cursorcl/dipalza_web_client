import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from 'environments/environment';

import { ListasPrecioComponent } from './listas-precio.component';
import { ListaPrecio } from '../services/lista-precio.service';

describe('ListasPrecioComponent', () => {
  let component: ListasPrecioComponent;
  let fixture: ComponentFixture<ListasPrecioComponent>;
  let httpMock: HttpTestingController;

  const listas: ListaPrecio[] = [
    { codigo: '001', nombre: 'lista general', rol: 'P' },
    { codigo: '500', nombre: 'DETALLE', rol: 'S' },
    { codigo: '100', nombre: '', rol: null }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListasPrecioComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ListasPrecioComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('debe cargar las listas de precio al iniciar', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/listas-precio`);
    expect(req.request.method).toBe('GET');
    req.flush(listas);

    expect(component.rows.length).toBe(3);
    expect(component.rows.find(l => l.codigo === '001')?.rol).toBe('P');
  });
});
