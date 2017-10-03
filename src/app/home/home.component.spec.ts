import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { HomeComponent } from './home.component';

describe('Home component -', () => {
    let component: HomeComponent;
    let fixture: ComponentFixture<HomeComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [HomeComponent]
        });

        fixture = TestBed.createComponent(HomeComponent);
        component = fixture.componentInstance;

    });

    it('title is \'Hello World!\'', () => {
        fixture.detectChanges();
        const de: DebugElement = fixture.debugElement.query(By.css('h3'));
        expect(de.nativeElement.textContent).toBe('Hello World!');
    });
});
