import { TestBed } from '@angular/core/testing';
import { MenuComponent } from './menu.component';

describe('Menu component', () => {
    beforeAll(() => {
        TestBed.configureTestingModule({
            declarations: [MenuComponent]
        });
    });

    beforeEach(() => {
        TestBed.compileComponents();
    });

    it('true is true 2', () => {
        expect(true).toBe(true);
    });
});
