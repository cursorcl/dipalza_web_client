import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ListadoVendedoresFaltantesComponent } from './listado-vendedores-faltantes.component';
import { VentasService } from '../ventas.service';

describe('ListadoVendedoresFaltantesComponent', () => {
  let fixture: ComponentFixture<ListadoVendedoresFaltantesComponent>;
  let component: ListadoVendedoresFaltantesComponent;
  let ventasServiceMock: jasmine.SpyObj<VentasService>;
  let router: Router;

  async function crear(queryParams: Record<string, string>) {
    ventasServiceMock = jasmine.createSpyObj('VentasService', ['obtenerFaltantes']);
    ventasServiceMock.obtenerFaltantes.and.callFake((fecha?: string) =>
      of({ fecha: fecha ?? '2026-10-30', facturas: [] }));

    await TestBed.configureTestingModule({
      imports: [ListadoVendedoresFaltantesComponent],
      providers: [
        provideRouter([]),
        { provide: VentasService, useValue: ventasServiceMock },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(ListadoVendedoresFaltantesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('sin parámetros pide la última fecha al backend y la deja en la URL', async () => {
    await crear({});

    expect(ventasServiceMock.obtenerFaltantes).toHaveBeenCalledWith(undefined);
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { fecha: '2026-10-30', vista: null },
      replaceUrl: true,
    }));
  });

  it('toma la fecha y la vista desde la URL', async () => {
    await crear({ fecha: '2026-10-15', vista: 'producto' });

    expect(ventasServiceMock.obtenerFaltantes).toHaveBeenCalledWith('2026-10-15');
    expect(component.vista).toBe('producto');
  });

  it('ignora una fecha con formato inválido en la URL', async () => {
    await crear({ fecha: 'ayer' });

    expect(ventasServiceMock.obtenerFaltantes).toHaveBeenCalledWith(undefined);
  });

  it('cambiar de vista actualiza la URL', async () => {
    await crear({});
    (router.navigate as jasmine.Spy).calls.reset();

    component.cambiarVista('producto');

    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { fecha: '2026-10-30', vista: 'producto' },
    }));
  });
});
