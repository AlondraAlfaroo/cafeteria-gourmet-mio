import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReporteSucursalComponent } from './reporte-sucursal.component';

describe('ReporteSucursalComponent', () => {
  let component: ReporteSucursalComponent;
  let fixture: ComponentFixture<ReporteSucursalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteSucursalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReporteSucursalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
