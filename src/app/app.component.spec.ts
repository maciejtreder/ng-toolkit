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

let fixture: ComponentFixture<AppComponent>;

const connectivityServiceStub = sinon.createStubInstance(ConnectivityService);
const serviceWorkerServiceStub = sinon.createStubInstance(ServiceWorkerService);
const isUpdateAvailable: BehaviorSubject<boolean> = new BehaviorSubject(false);
serviceWorkerServiceStub.update.returns(isUpdateAvailable);

xdescribe('App component', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [AppComponent],
            imports: [RouterTestingModule, MdSnackBarModule],
            providers: [
                {provide: ConnectivityService, useValue: connectivityServiceStub},
                DeviceService,
                WindowRef,
                {provide: ServiceWorkerService, useValue: serviceWorkerServiceStub},
            ],
            schemas: [ NO_ERRORS_SCHEMA ]
        });

        isUpdateAvailable.next(false);

        fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
    });

    // it('Should display information about update', () => {
    //     isUpdateAvailable.next(true);
    //     expect(true).toBeTruthy();
    // });
    // it('Should display notifications', async(() => {
    //     fixture.componentInstance
    // }));
});
