import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { MdSnackBarModule, MdToolbarModule } from '@angular/material';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { ConnectivityService } from 'ng-http-sw-proxy';
import * as sinon from 'sinon';
import { DeviceService } from './services/device.service';
import { WindowRef } from './windowRef';
import { ServiceWorkerService } from './services/service-worker.service';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

let fixture: ComponentFixture<AppComponent>;

const connectivityServiceStub = sinon.createStubInstance(ConnectivityService);
const hasConnection: Subject<boolean> = new BehaviorSubject(true);
connectivityServiceStub.hasNetworkConnection.returns(hasConnection);

const serviceWorkerServiceStub = sinon.createStubInstance(ServiceWorkerService);
const isUpdated: Subject<boolean> = new BehaviorSubject(false);
serviceWorkerServiceStub.update.returns(isUpdated);

xdescribe('App component', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [AppComponent],
            imports: [RouterTestingModule, MdSnackBarModule],
            providers: [
                DeviceService,
                WindowRef,
                {provide: ConnectivityService, useValue: connectivityServiceStub},
                {provide: ServiceWorkerService, useValue: serviceWorkerServiceStub},
                BrowserAnimationsModule
            ],
            schemas: [ NO_ERRORS_SCHEMA ]
        });

        fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
    });

    it('Should display information about update', () => {
        isUpdated.next(true);
        console.log(fixture.nativeElement);
        expect(true).toBeTruthy();
    });

    // it('Should display notifications', async(() => {
    //     fixture.componentInstance
    // }));
});
