import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ListadoHojaRutaComponent } from './listado-hoja-ruta.component';
import { VentasService } from '../ventas.service';

describe('ListadoHojaRutaComponent', () => {
  let fixture: ComponentFixture<ListadoHojaRutaComponent>;
  let ventasServiceMock: jasmine.SpyObj<VentasService>;
  let router: Router;

  async function crear(queryParams: Record<string, string>) {
    ventasServiceMock = jasmine.createSpyObj('VentasService', ['obtenerHojaRuta', 'descargarHojaRuta']);
    ventasServiceMock.obtenerHojaRuta.and.returnValue(of({ rutas: [] } as any));

    await TestBed.configureTestingModule({
      imports: [ListadoHojaRutaComponent],
      providers: [
        provideRouter([]),
        { provide: VentasService, useValue: ventasServiceMock },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(ListadoHojaRutaComponent);
    fixture.detectChanges();
  }

  it('toma la fecha desde la URL y la mantiene ahí', async () => {
    await crear({ fecha: '2026-10-15' });

    expect(ventasServiceMock.obtenerHojaRuta).toHaveBeenCalledWith('2026-10-15');
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { fecha: '2026-10-15' },
      replaceUrl: true,
    }));
  });

  it('sin fecha en la URL usa el día de hoy', async () => {
    await crear({});

    const hoy = new Date().toISOString().split('T')[0];
    expect(ventasServiceMock.obtenerHojaRuta).toHaveBeenCalledWith(hoy);
  });
});
