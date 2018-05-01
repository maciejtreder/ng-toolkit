import { AppComponent } from './app.component';
import { async, ComponentFixture, fakeAsync, inject, TestBed, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { SnackBar } from './services/snack-bar.service';
import * as sinon from 'sinon';
import { SwUpdate } from '@angular/service-worker';
import { UpdateActivatedEvent, UpdateAvailableEvent } from '@angular/service-worker/src/low_level';
import { WindowRef } from './window-ref.service';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { SwUpdateServerMock } from './services/swUpdate-server.mock.service';
import { Observable, of, Subject } from 'rxjs';

let fixture: ComponentFixture<AppComponent>;
let windowStub;
let snackBarServiceStub;
let swUpdateStub;
let metaStub;
let component: any;

const updates: Subject<UpdateAvailableEvent> = new Subject();
const activated: Subject<UpdateActivatedEvent> = new Subject();

class FakeLoader implements TranslateLoader {
  public getTranslation(lang: string): Observable<any> {
    return of({HELLO: 'This is a translation'});
  }
}

describe('App component', () => {
  beforeEach(async(() => {
    swUpdateStub = sinon.createStubInstance(SwUpdateServerMock);
    swUpdateStub.checkForUpdate.returns(new Promise((resolve) => resolve()));
    swUpdateStub.activateUpdate.returns(new Promise((resolve) => resolve()));
    swUpdateStub.available = updates;
    swUpdateStub.activated = activated;
    swUpdateStub.isEnabled = true;

    windowStub = sinon.createStubInstance(WindowRef);
    windowStub._window = {
      navigator: {
        userAgent: 'test'
      },
      location: {
        reload: () => { const sth = 1 + 1; }
      }
    };

    snackBarServiceStub = sinon.createStubInstance(SnackBar);

    metaStub = sinon.createStubInstance(Meta);
    metaStub.getTag.returns('something');

    TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: {provide: TranslateLoader, useClass: FakeLoader},
        })
        // ServiceWorkerModuleMock
      ],
      providers: [
        {provide: WindowRef, useValue: windowStub},
        {provide: SwUpdate, useValue: swUpdateStub},
        {provide: SnackBar, useValue: snackBarServiceStub},
        {provide: Meta, useValue: metaStub}
      ],
      schemas: [ NO_ERRORS_SCHEMA ]
    });

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    component = fixture.debugElement.nativeElement;
  }));

  it('Should contain header, menu and footer', () => {
    expect(component.querySelector('h1')).toBeDefined();
    expect(component.querySelector('menu')).toBeDefined();
    expect(component.querySelector('footer')).toBeDefined();
  });

  it('Should check for service worker update when application is initialized, and install update', async(() => {
    expect(swUpdateStub.checkForUpdate.calledOnce).toBe(true, 'Check for update method was not called.');
    // expect(swUpdateStub.activateUpdate.called).toBe(true, 'Activate update method was not called.');
  }));

  it('Should display notification when service worker update is done', () => {
    updates.next({current: {hash: 'asdf'}, available: {hash: 'fdsa'}} as UpdateAvailableEvent);
    expect(snackBarServiceStub.displayNotification.called).toBe(true, 'Snack bar was not displayed');
    expect(snackBarServiceStub.displayNotification.calledOnce).toBe(true, 'Snack bar was displayed more then once');
  });

  it('Update snackbar should contain page reload as a callback', () => {
    updates.next({current: {hash: 'asdf'}, available: {hash: 'fdsa'}} as UpdateAvailableEvent);
    const spy = sinon.spy(windowStub._window.location, 'reload');
    snackBarServiceStub.displayNotification.getCall(0).args[0].callback();
    expect(spy.called).toBeTruthy('Reload method was not called');
  });

  xit( 'Should display notification about cached content', () => {
    activated.next({current: {hash: 'asdf'}} as UpdateActivatedEvent);
    expect(snackBarServiceStub.displayNotification.called).toBe(true, 'Notification was not displayed');
  });

  xit('Should display notification about cached content only once', () => {
    localStorage.clear();
    activated.next({current: {hash: 'asdf'}} as UpdateActivatedEvent);
    activated.next({current: {hash: 'asdf'}} as UpdateActivatedEvent);
    expect(snackBarServiceStub.displayNotification.called).toBe(true, 'Notification was not displayed');
    expect(snackBarServiceStub.displayNotification.calledOnce).toBe(true, 'Notification was not displayed once');
  });
});
