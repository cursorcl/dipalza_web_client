import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { EdicionNumeradosComponent } from './edicion-numerados.component';

describe('EdicionNumeradosComponent', () => {
  let component: EdicionNumeradosComponent;
  let fixture: ComponentFixture<EdicionNumeradosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EdicionNumeradosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EdicionNumeradosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('arranca en modo alta cuando no hay estado de navegación', () => {
    expect(component.esEdicion).toBeFalse();
  });
});
