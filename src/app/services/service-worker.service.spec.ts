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
        ngServiceWorkerStub.log.returns(Observable.of('test'));
        ngServiceWorkerStub.ping.returns(Observable.of('pong'));
        windowStub = sinon.createStubInstance(WindowRef);
        windowStub._window = { navigator: {
            userAgent: 'test',
            serviceWorker: {
                getRegistrations: new Promise((resolve) => resolve()),
                ready: new Promise((resolve) => resolve({active: {state: 'activated'}}))
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
        expect(sws.isServiceWorkerAvailable()).toBe(true, );
    })));

    it('Should update when update is available', async(inject([ServiceWorkerService], (sws: ServiceWorkerService) => {
        ngServiceWorkerStub.checkForUpdate.returns(Observable.of(true));
        ngServiceWorkerStub.activateUpdate.returns(Observable.of(true));
        ngServiceWorkerStub.updates = Observable.of({type: 'pending', version: '02f899d4bbba2b554e501f826aadc5178d263898'});

        let response;
        sws.update().subscribe((resp) => response = resp);
        expect(ngServiceWorkerStub.checkForUpdate.calledOnce).toBe(true, 'Check for update method has not been called');
        expect(ngServiceWorkerStub.activateUpdate.calledOnce).toBe(true, 'Activate update method has not been called');

    })));

    it('Should not update when update is not available', async(inject([ServiceWorkerService], (sws: ServiceWorkerService) => {
        ngServiceWorkerStub.checkForUpdate.returns(Observable.of(false));

        sws.update().subscribe();

        expect(ngServiceWorkerStub.checkForUpdate.calledOnce).toBe(true, 'Check for update method has not been called');
        expect(ngServiceWorkerStub.activateUpdate.calledOnce).toBe(false, 'Activate update method has been called');
    })));

    it('Should not try update when there is no navigator', async(inject([ServiceWorkerService], (sws: ServiceWorkerService) => {
        windowStub._window = {navigator: {
            userAgent: 'test'
        }};
        let response;
        sws.update().subscribe((resp) => response = resp);

        expect(response).toBe(false, 'Response from updated is not equal to false');
        expect(ngServiceWorkerStub.checkForUpdate.called).toBe(false, 'check for update method has been called.');
        expect(ngServiceWorkerStub.activateUpdate.called).toBe(false, 'activate update methods has been called.');
    })));

    it('When service worker is not available, cache should return false', async(inject([ServiceWorkerService], (sws: ServiceWorkerService) => {
        sinon.stub(sws, 'isServiceWorkerAvailable').returns(false);

        let response;
        sws.isCached().subscribe((resp) => response = resp);
        expect(response).toBe(false, 'Did not respond with expected value.');
    })));

    xit('When service worker is available, information about cache should be sent', async(inject([ServiceWorkerService], (sws: ServiceWorkerService) => {
        windowStub._window.navigator.serviceWorker.ready = new Promise((resolve) => resolve({active: {state: 'waiting'}}));
        let response;
        sws.isCached().subscribe((resp) => response = resp);
        expect(response).toBe(true, 'Should respond as cached');
    })));

    xit('When service worker is available, but not ready should get false', async(inject([ServiceWorkerService], (sws: ServiceWorkerService) => {
        windowStub._window.navigator.serviceWorker.ready = new Promise((resolve) => resolve({active: {state: 'waiting'}}));
        let response;
        sws.isCached().subscribe((resp) => response = resp);
        expect(response).toBe(false, 'Should respond as not cached');
    })));
});
