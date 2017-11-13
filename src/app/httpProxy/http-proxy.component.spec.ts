import { Observable } from 'rxjs';
import { Http } from '@angular/http';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed, async, tick, fakeAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement, NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpProxyComponent } from './http-proxy.component';

xdescribe('Http-proxy component -', () => {
    let component: HttpProxyComponent;
    let fixture: ComponentFixture<HttpProxyComponent>;
    let httpService: Http;
    let spy;
    const httpProxyStub = {
        post: (url: string, object: any) => Observable.of({json: () => 'test response'})
    };

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [HttpProxyComponent],
            imports: [
                FormsModule,
                NoopAnimationsModule
            ],
            providers: [{provide: Http, useValue: httpProxyStub}],
            schemas: [ NO_ERRORS_SCHEMA ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(HttpProxyComponent);
        component = fixture.componentInstance;
        httpService = TestBed.get(Http);
        spy = spyOn(httpService, 'post').and.callThrough();
    });

    it('title is \'Proxy demo!\'', () => {
        fixture.detectChanges();
        const de: DebugElement = fixture.debugElement.query(By.css('h3'));
        expect(de).not.toBe(null);
        expect(de.nativeElement.textContent).toBe('Proxy demo!');
    });

    it('button should be displayed', () => {
        fixture.detectChanges();
        const button: DebugElement = fixture.debugElement.query(By.css('button'));
        expect(button).not.toBe(null);
        expect(button.nativeElement.textContent).toBe('send request');
    });

    it('input should be displayed', () => {
        fixture.detectChanges();
        const input: DebugElement = fixture.debugElement.query(By.css('input'));
        expect(input).not.toBe(null);
    });

    it('should be able to send requests to backend', () => {
        expect(spy.calls.any()).toBe(false);
        fixture.detectChanges();
        const input: HTMLInputElement = fixture.debugElement.query(By.css('input')).nativeElement;
        input.value = 'request value';
        const button: DebugElement = fixture.debugElement.query(By.css('button'));
        button.nativeElement.click();
        expect(spy.calls.any()).toBe(true);
    });

    it('should display response', fakeAsync(() => {
        fixture.detectChanges();
        const input: HTMLInputElement = fixture.debugElement.query(By.css('input')).nativeElement;
        input.value = 'request value';
        const button: DebugElement = fixture.debugElement.query(By.css('button'));
        button.nativeElement.click();
        tick();
        fixture.detectChanges();
        const spanResponse: DebugElement = fixture.debugElement.query(By.css('#response'));
        expect(spanResponse.nativeElement.textContent).toContain('test response');
    }));

    it('should contain anchors providing to github and npm repo', () => {
        fixture.detectChanges();
        const anchors = fixture.debugElement.queryAll(By.css('a'));
        expect(anchors[0].nativeElement.textContent).toBe('ng-http-sw-proxy on npm');
        expect(anchors[1].nativeElement.textContent).toBe('ng-http-sw-proxy on github');
    });
});
