import { async, fakeAsync, inject, TestBed, tick } from '@angular/core/testing';
import { Http, RequestOptions, RequestOptionsArgs, Response, Headers } from '@angular/http';
import { ServiceWorkerService } from './service-worker.service';
import { NotificationService } from './notification.service';
import { WindowRef } from '../windowRef';
import { NgServiceWorker, NgPushRegistration } from '@angular/service-worker';
import { Observable } from 'rxjs';
import * as sinon from 'sinon';

describe('Service-worker spec.', () => {
    let ngServiceWorkerStub;
    let serviceWorkerServiceStub;
    let httpStub;
    let windowStub;

    const pushSubscription1 = {ps: {endpoint: 'http://endpoint.com/123'}, unsubscribe: () => Observable.of(true)};
    const pushSubscription2 = {ps: {endpoint: 'http://endpoint.com/321'}, unsubscribe: () => Observable.of(true)};

    beforeEach(() => {
        ngServiceWorkerStub = sinon.createStubInstance(NgServiceWorker);
        serviceWorkerServiceStub = sinon.createStubInstance(ServiceWorkerService);
        httpStub = sinon.createStubInstance(Http);
        windowStub = sinon.createStubInstance(WindowRef);

        windowStub._window = {navigator: {
            userAgent: 'test',
            serviceWorker: {
                getRegistrations: new Promise((resolve) => resolve())
            }
        }};

        serviceWorkerServiceStub.isServiceWorkerAvailable.returns(true);

        ngServiceWorkerStub.registerForPush.returns(Observable.of(pushSubscription1));
        httpStub.post.returns(Observable.of({status: 202} as Response));
    });

    const setUpTestbed = () => {
        TestBed.configureTestingModule({
            providers: [
                NotificationService,
                NgServiceWorker,
                { provide: ServiceWorkerService, useValue: serviceWorkerServiceStub },
                { provide: NgServiceWorker, useValue: ngServiceWorkerStub },
                { provide: Http, useValue: httpStub },
                { provide: WindowRef, useValue: windowStub }
            ]
        });
    };

    describe('Without subscribed client.', () => {
        beforeEach(() => {
            localStorage.clear();
            setUpTestbed();
        });

        it('Should construct', async(inject([NotificationService], (ns) => {
            expect(ns).toBeDefined();
        })));

        it( 'Should respond as not subscribed when there is no subscription', async(inject([NotificationService], (ns: NotificationService) => {
            expect(ns.isRegistered()).toBeFalsy();
        })));

        it('Should check if push is available before subscribing', async(inject([NotificationService], (ns: NotificationService) => {
            serviceWorkerServiceStub.isServiceWorkerAvailable.returns(false);
            const spy = sinon.spy(ns, 'isPushAvailable');
            ns.registerToPush().subscribe();
            expect(spy.calledOnce).toBeTruthy();
        })));

        describe('VAPID.', () => {
            it('Should be able to check if push is available', async(inject([NotificationService], (ns: NotificationService) => {
                expect(ns.isPushAvailable()).toBeTruthy();
            })));

            it('Should be able to check if push is NOT available', async(inject([NotificationService], (ns: NotificationService) => {
                serviceWorkerServiceStub.isServiceWorkerAvailable.returns(false);
                expect(ns.isPushAvailable()).toBeFalsy();
            })));

            it('Should not subscribe when push is not available', async(inject([NotificationService], (ns: NotificationService) => {
                serviceWorkerServiceStub.isServiceWorkerAvailable.returns(false);
                let gotResponse = false;
                ns.registerToPush().subscribe((result) => {
                    gotResponse = true;
                    expect(result).toBeFalsy();
                });
                expect(gotResponse).toBeTruthy();
            })));

            it('Should call registerForPush method', async(inject([NotificationService], (ns: NotificationService) => {
                ns.registerToPush().subscribe();
                expect(ngServiceWorkerStub.registerForPush.calledOnce).toBeTruthy();
            })));

            it( 'Should call /vapid/subscribe endpoint with proper payload', async(inject( [NotificationService], (ns: NotificationService) => {
                ns.vapidSubscriptionEndpoint = 'http-endpoint';
                ns.registerToPush().subscribe();
                expect(httpStub.post.calledOnce).toBeTruthy();
                const call = httpStub.post.getCall(0);
                expect(call.args[0]).toBe('http-endpoint/subscribe');
                expect(call.args[1]).toBe(JSON.stringify(pushSubscription1));
            })));

            it( 'Should store subscription in local storage when it is succesfully sent to origin', async(inject([NotificationService], (ns: NotificationService) => {
                ns.registerToPush().subscribe();
                expect(localStorage.getItem('subscription')).toBe(JSON.stringify(pushSubscription1));
            })));

            it( 'Should not store subscription when get other then 202 response from origin', async(inject([NotificationService], (ns: NotificationService) => {
                httpStub.post.returns(Observable.of({status: 400}));
                ns.registerToPush().subscribe((result) => {
                    expect(result).toBeFalsy();
                });
                expect(localStorage.getItem('subscription')).toBeNull();
                expect(ns.isRegistered()).toBeFalsy();
                expect(httpStub.post.calledOnce).toBeTruthy();
            })));

            it('Should not try to subscribe when another subscription is pending', async(inject([NotificationService], (ns: NotificationService) => {
                let errorThrowed = false;
                ns.registerToPush().subscribe();
                ns.registerToPush().subscribe(null, (error) => {
                    expect(error).toBe('Another registration is pending or active.');
                    errorThrowed = true;
                });
                expect(errorThrowed).toBeTruthy();
                expect(ngServiceWorkerStub.registerForPush.calledOnce).toBeTruthy();
            })));

            it('Should be able to retry subscription', async(inject([NotificationService], (ns: NotificationService) => {
                httpStub.post.returns(Observable.of({status: 400}));
                ns.registerToPush().subscribe();
                expect(ns.isRegistered()).toBeFalsy();
                httpStub.post.returns(Observable.of({status: 202}));
                ns.registerToPush().subscribe((result) => {
                    expect(result).toBeTruthy();
                });
                expect(ns.isRegistered()).toBeTruthy();
                expect(ngServiceWorkerStub.registerForPush.calledTwice).toBeTruthy();
            })));

            it('Should be able to subscribe for VAPID subscription', async(inject([NotificationService], (ns: NotificationService) => {
                ns.registerToPush().subscribe((result) => {
                    expect(result).toBeTruthy();
                });
                expect(ns.isRegistered()).toBeTruthy();
            })));

            it('Should be able to unregister', async(inject([NotificationService], (ns: NotificationService) => {
                ns.registerToPush().subscribe();
                ns.unregisterFromPush().subscribe((result) => {
                    expect(result).toBeTruthy();
                });
                expect(ns.isRegistered()).toBeFalsy();
                expect(httpStub.post.calledTwice).toBeTruthy();
            })));

            it('Should not unregister not registered', async(inject([NotificationService], (ns: NotificationService) => {
                ns.unregisterFromPush().subscribe((result) => {
                    expect(result).toBeFalsy();
                });
                expect(httpStub.post.notCalled).toBeTruthy();
                expect(ns.isRegistered()).toBeFalsy();
            })));

        });

        describe('Safari.', () => {
            beforeEach(() => {
                windowStub._window = {
                    safari: {
                        pushNotification: {}
                    }
                };
                serviceWorkerServiceStub.isServiceWorkerAvailable.returns(false);
            });

            it('Should be able to check if push is available on Safari with push', async(inject([NotificationService], (ns: NotificationService) => {
                expect(ns.isPushAvailable()).toBeTruthy();
            })));

            it('Should be able to check if push is NOT available on Safari without push', async(inject([NotificationService], (ns: NotificationService) => {
                windowStub._window = {
                    safari: {}
                };
                expect(ns.isPushAvailable()).toBeFalsy();
            })));

            xit( 'Should be able to subscribe', async(inject([NotificationService], (ns: NotificationService) => {
                let gotResult: boolean = false;
                ns.registerToPush().subscribe((result) => {
                    expect(result).toBeTruthy();
                    expect(result).toBe(true, 'Should respond with \'true\'.');
                    gotResult = true;
                });
                expect(gotResult).toBe(true, 'Observable did not give output.');
            })));
        });
    });

    describe('With subscribed client.', () => {
        beforeEach(() => {
            localStorage.clear();
        });
        describe('VAPID.', () => {

            beforeEach(() => {
                localStorage.setItem('subscription', JSON.stringify(pushSubscription2));
                setUpTestbed();
            });

            it('Should respond as subscribed when there is subscription in local storage', async(inject([NotificationService], (ns: NotificationService) => {
                expect(ns.isRegistered()).toBeTruthy();
            })));

            it('Should be able to unregister', async(inject([NotificationService], (ns: NotificationService) => {
                ns.unregisterFromPush().subscribe((result) => {
                    expect(result).toBeTruthy();
                });
                expect(ns.isRegistered()).toBeFalsy();
            })));

            it('Should not be able to register again', async(inject([NotificationService], (ns: NotificationService) => {
                let gotResult: boolean = false;
                ns.registerToPush().subscribe(null, (error) => {
                    expect(error).toBe('Another registration is pending or active.');
                    gotResult = true;
                });
                expect(gotResult).toBeTruthy();
            })));
        });
    });
});
