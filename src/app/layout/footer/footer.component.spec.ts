import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatherModule } from 'angular-feather';
import { allIcons } from 'angular-feather/icons';

import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [FooterComponent, FeatherModule.pick(allIcons)]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
