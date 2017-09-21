//import { async, inject, TestBed } from '@angular/core/testing';
//import { ServiceWorkerService } from './service-worker.service';
//import { WindowRef } from '../windowRef';
//import { NgServiceWorker, NgPushRegistration } from '@angular/service-worker';
//import { RequestOptions, Headers, RequestOptionsArgs, Http, Response } from '@angular/http';
//import * as sinon from 'sinon';
//
//describe('service-worker spec ', () => {
//    let ngServiceWorkerStub;
//    let httpStub;
//    let windowStub;
//    beforeEach(() => {
//        ngServiceWorkerStub = sinon.createStubInstance(NgServiceWorker);
//        httpStub = sinon.createStubInstance(Http);
//        windowStub = sinon.createStubInstance(WindowRef);
//        TestBed.configureTestingModule({
//            providers: [
//                ServiceWorkerService,
//                { provide: NgServiceWorker, useValue: ngServiceWorkerStub },
//                { provide: Http, useValue: httpStub },
//                { provide: WindowRef, useValue: windowStub }
//            ]
//        });
//    });
//
//    it('Should construct', async(inject([ServiceWorkerService], (sws) => {
//        expect(sws).toBeDefined();
//    })));
//
//    it('Should install service worker with the constructor', async(inject([ServiceWorkerService], (sws) => {
//        expect(sws).toBeDefined();
//    })));
//});
