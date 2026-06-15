import { TestBed } from '@angular/core/testing';

import { AdminProductoService } from './admin-producto.service';

describe('AdminProductoService', () => {
  let service: AdminProductoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminProductoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
