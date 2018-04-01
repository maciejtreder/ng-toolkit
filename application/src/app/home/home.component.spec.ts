import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';

describe('Home component -', () => {
    let component: any;
    let fixture: ComponentFixture<HomeComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [HomeComponent]
        });

        fixture = TestBed.createComponent(HomeComponent);
        fixture.detectChanges();
        component = fixture.debugElement.nativeElement;
    });

    it('title is \'Home\'', () => {
        expect(component.querySelector('h1').textContent).toBe('Home');
    });
});
