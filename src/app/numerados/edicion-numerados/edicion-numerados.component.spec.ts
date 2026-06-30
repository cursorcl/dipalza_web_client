import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EdicionNumeradosComponent } from './edicion-numerados.component';

describe('EdicionNumeradosComponent', () => {
  let component: EdicionNumeradosComponent;
  let fixture: ComponentFixture<EdicionNumeradosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EdicionNumeradosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EdicionNumeradosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
