import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PodReaderComponent } from './pod-reader.component';

describe('PodReaderComponent', () => {
  let component: PodReaderComponent;
  let fixture: ComponentFixture<PodReaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PodReaderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PodReaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
