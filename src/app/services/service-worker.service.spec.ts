import { async, inject, TestBed } from '@angular/core/testing';
import { ServiceWorkerService } from './service-worker.service';
import { WindowRef } from '../windowRef';
import { NgServiceWorker } from '@angular/service-worker';
import { Observable } from 'rxjs';
import * as sinon from 'sinon';

describe('service-worker spec ', () => {
    let ngServiceWorkerStub;
    let windowStub;
    beforeEach(() => {
        ngServiceWorkerStub = sinon.createStubInstance(NgServiceWorker);
        windowStub = sinon.createStubInstance(WindowRef);
        windowStub._window = {navigator: {
            userAgent: 'test',
            serviceWorker: {
                getRegistrations: new Promise((resolve) => resolve())
            }
        }};
        TestBed.configureTestingModule({
            providers: [
                ServiceWorkerService,
                { provide: NgServiceWorker, useValue: ngServiceWorkerStub },
                { provide: WindowRef, useValue: windowStub }
            ]
        });
    });

    it('Should construct', async(inject([ServiceWorkerService], (sws) => {
        expect(sws).toBeDefined();
    })));

    it('Should be able to check if service worker is available', async(inject([ServiceWorkerService], (sws) => {
        expect(sws.isServiceWorkerAvailable()).toBeTruthy();
    })));

    it('Should update when update is available', async(inject([ServiceWorkerService], (sws: ServiceWorkerService) => {
        ngServiceWorkerStub.checkForUpdate.returns(Observable.of(true));
        ngServiceWorkerStub.activateUpdate.returns(Observable.of(true));
        ngServiceWorkerStub.updates = Observable.of({type: 'pending', version: '02f899d4bbba2b554e501f826aadc5178d263898'});
        sws.update().subscribe((resp) => {
            expect(ngServiceWorkerStub.checkForUpdate.calledOnce).toBeTruthy();
            expect(ngServiceWorkerStub.activateUpdate.calledOnce).toBeTruthy();
        });
    })));

    it('Should not update when update is not available', async(inject([ServiceWorkerService], (sws: ServiceWorkerService) => {
        ngServiceWorkerStub.checkForUpdate.returns(Observable.of(false));
        sws.update().subscribe((resp) => {
            expect(ngServiceWorkerStub.checkForUpdate.calledOnce).toBeTruthy();
            expect(ngServiceWorkerStub.activateUpdate.calledOnce).toBeFalsy();
        });
    })));

    it('Should not try update when there is no navigator', async(inject([ServiceWorkerService], (sws: ServiceWorkerService) => {
        windowStub._window = {navigator: {
            userAgent: 'test'
        }};
        sws.update().subscribe((resp) => {
            expect(resp).toBeFalsy();
            expect(ngServiceWorkerStub.checkForUpdate.called).toBeFalsy();
            expect(ngServiceWorkerStub.activateUpdate.called).toBeFalsy();
        });
    })));
});
