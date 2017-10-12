import { async, ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { ConnectivityService } from 'ng-http-sw-proxy';
import * as sinon from 'sinon';
import { DeviceService } from './services/device.service';
import { WindowRef } from './windowRef';
import { ServiceWorkerService } from './services/service-worker.service';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';
import { SnackBarService } from './services/snack-bar.service';
import { By } from '@angular/platform-browser';
import { Observable } from 'rxjs/Observable';

let fixture: ComponentFixture<AppComponent>;

let connectivityServiceStub;
let hasConnection: Subject<boolean>;

let windowStub;
let snackBarServiceStub;

let serviceWorkerServiceStub;
let isUpdated: Subject<boolean>;

describe('App component', () => {
    beforeEach(() => {
        Observable.prototype.debounceTime = function() { return this; }; // workaround for https://github.com/angular/angular/issues/10127

        connectivityServiceStub = sinon.createStubInstance(ConnectivityService);
        hasConnection = new BehaviorSubject(true);
        connectivityServiceStub.hasNetworkConnection.returns(hasConnection);

        serviceWorkerServiceStub = sinon.createStubInstance(ServiceWorkerService);
        isUpdated = new BehaviorSubject(false);
        serviceWorkerServiceStub.update.returns(isUpdated);

        windowStub = sinon.createStubInstance(WindowRef);
        windowStub._window = {navigator: {userAgent: 'test'}};

        snackBarServiceStub = sinon.createStubInstance(SnackBarService);

        TestBed.configureTestingModule({
            declarations: [AppComponent],
            imports: [RouterTestingModule],
            providers: [
                DeviceService,
                {provide: WindowRef, useValue: windowStub},
                {provide: ConnectivityService, useValue: connectivityServiceStub},
                {provide: ServiceWorkerService, useValue: serviceWorkerServiceStub},
                {provide: SnackBarService, useValue: snackBarServiceStub}
            ],
            schemas: [ NO_ERRORS_SCHEMA ]
        });

        fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
    });

    it('Should contain header, menu and footer', () => {
        expect(fixture.debugElement.query(By.css('menu'))).toBeDefined();
        expect(fixture.debugElement.query(By.css('h1'))).toBeDefined();
        expect(fixture.debugElement.query(By.css('footer'))).toBeDefined();
    });

    it('Should check for updates immediatelly after initializaiton', () => {
        expect(serviceWorkerServiceStub.update.called).toBeTruthy('Did not check for update');
    });

    it('Should display notification when service worker update is available', () => {
        isUpdated.next(true);
        expect(snackBarServiceStub.displayNotification.called).toBeTruthy('Snack bar was not displayed');
        expect(snackBarServiceStub.displayNotification.calledOnce).toBeTruthy('Snack bar was displayed more then once');
    });

    it('Should display notification in case of that user is offline', async(() => {
        hasConnection.next(false);
        expect(snackBarServiceStub.displayNotification.called).toBeTruthy('Notification was not displayed');
        expect(snackBarServiceStub.displayNotification.calledOnce).toBeTruthy('Snack bar was displayed more then once');
    }));

    it('Should display new notification when user is back online', async(() => {
        hasConnection.next(false);
        expect(snackBarServiceStub.displayNotification.called).toBeTruthy('Notification was not displayed');

        hasConnection.next(true);
        expect(snackBarServiceStub.displayNotification.calledTwice).toBeTruthy('Snack bar was not displayed twice');
        expect(snackBarServiceStub.displayNotification.getCall(1).args[0].force).toBeTruthy('Message about online status should be forced!');
    }));
});
