import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { LazyComponent } from './lazy.component';

describe('Lazy component -', () => {
    let component: LazyComponent;
    let fixture: ComponentFixture<LazyComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [LazyComponent]
        });

        fixture = TestBed.createComponent(LazyComponent);
        component = fixture.componentInstance;
    });

    it('title is \'Lazy loading\'', () => {
        fixture.detectChanges();
        const de: DebugElement = fixture.debugElement.query(By.css('h1'));
        expect(de.nativeElement.textContent).toBe('Lazy loading');
    });
});
