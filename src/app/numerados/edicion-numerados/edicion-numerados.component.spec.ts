import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { EdicionNumeradosComponent } from './edicion-numerados.component';

describe('EdicionNumeradosComponent', () => {
  let component: EdicionNumeradosComponent;
  let fixture: ComponentFixture<EdicionNumeradosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EdicionNumeradosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), NgbActiveModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EdicionNumeradosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('arranca en modo alta cuando no hay numerado en edición', () => {
    expect(component.esEdicion).toBeFalse();
  });
});
