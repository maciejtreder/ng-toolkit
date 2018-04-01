import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LazyComponent } from './lazy.component';

describe('Lazy component -', () => {
    let component: any;
    let fixture: ComponentFixture<LazyComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [LazyComponent]
        });

        fixture = TestBed.createComponent(LazyComponent);
        fixture.detectChanges();
        component = fixture.debugElement.nativeElement;
    });

    it('title is \'Lazy loading\'', () => {
        expect(component.querySelector('h1').textContent).toBe('Lazy loading');
    });
});
