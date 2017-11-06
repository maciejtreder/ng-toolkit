import { ApplicationRef, Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { ServiceWorkerService } from './service-worker.service';
import { NgPushRegistration, NgServiceWorker } from '@angular/service-worker';
import { WindowRef } from '../windowRef';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs/Observable';
import { RequestOptions, RequestOptionsArgs, Headers, Http, Response } from '@angular/http';
import { Subscriber } from 'rxjs/Subscriber';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable()
export class NotificationService {

    public endpoint: string = 'https://api.angular-universal-pwa.maciejtreder.com/webpush';
    public vapidSubscriptionEndpoint: string = this.endpoint + '/vapid';
    public safariSubscriptionEndpoint: string = this.endpoint + '/safari';

    private _isSubscribed: boolean;
    private _isSubscribedObs: Subject<boolean> = new BehaviorSubject(false);
    private applicationServerKey: string =
        'BKxp6BwVzRWy1Qbe63rHNbG46uwPTrl1RoeTJuyVBm42kvlUk0RuSkYk8NKoO0QK2GNV7eRhOLyV1KfmZhwU9Sc';
    private subscription: NgPushRegistration;
    private headers: HttpHeaders;

    constructor(private window: WindowRef, private serviceWorkerService: ServiceWorkerService, @Inject(PLATFORM_ID) private platformId: any, private serviceWorker: NgServiceWorker, private http: HttpClient, private appRef: ApplicationRef) {
        this.checkSubscription();
        this.headers = new HttpHeaders();
        this.headers.append('content-type', 'application/json');
    }

    public isPushAvailable(): boolean {
        return isPlatformBrowser(this.platformId) && ((!!this.window.nativeWindow['safari'] && !!this.window.nativeWindow['safari'].pushNotification) || this.serviceWorkerService.isServiceWorkerAvailable());
    }

    public registerToPush(): Observable<boolean> {
        if (!this.isPushAvailable()) {
            return Observable.of(false);
        }
        if (this._isSubscribed) {
            return Observable.create((subscriber: Subscriber<boolean>) => subscriber.error('Another registration is pending or active.'));
        }
        this._isSubscribed = true; // for locking purpose, only one subscription try at time.
        if (this.serviceWorkerService.isServiceWorkerAvailable()) {
            return this.registerVapid();
        } else {
            return this.registerSafari();
        }
    }

    public isRegistered(): Observable<boolean> {
        return this._isSubscribedObs;
    }

    public unregisterFromPush(): Observable<boolean> {
        if (this.serviceWorkerService.isServiceWorkerAvailable() && this._isSubscribed) {
            return Observable.create((subscriber: Subscriber<boolean>) => {
                this.http.post(this.vapidSubscriptionEndpoint + '/unsubscribe', JSON.stringify(this.subscription), {headers: this.headers}).subscribe(() => {
                    localStorage.removeItem('subscription');
                    this.checkSubscription();
                    subscriber.next(true);
                }, () => subscriber.next(false));
            });
        }
        return Observable.of(false);
    }

    private checkSubscription(): void {
        if (this.window.nativeWindow['safari']) {
            const result = this.window.nativeWindow['safari'].pushNotification.permission(
                'web.com.maciejtreder.angular-universal-pwa'
            );
            this._isSubscribed = result.permission === 'granted';
        } else if (this.serviceWorkerService.isServiceWorkerAvailable()) {
            this.subscription = JSON.parse(localStorage.getItem('subscription'));
            this._isSubscribed = !!this.subscription;
        } else {
            this._isSubscribed = false;
        }
        this._isSubscribedObs.next(this._isSubscribed);
    }

    private registerVapid(): Observable<boolean> {
        return Observable.create((subscriber: Subscriber<boolean>) => {
            this.serviceWorker
                .registerForPush({applicationServerKey: this.applicationServerKey})
                .subscribe((pushRegistration: NgPushRegistration) => {
                    this.http.post(this.vapidSubscriptionEndpoint + '/subscribe', JSON.stringify(pushRegistration), {headers: this.headers})
                        .subscribe((response: Response) => {
                            if (response.status === 202) {
                                localStorage.setItem('subscription', JSON.stringify(pushRegistration));
                            } else {
                                pushRegistration.unsubscribe().subscribe();
                            }
                            this.checkSubscription();
                            subscriber.next(this._isSubscribed);
                        });
                });
        });
    }

    private registerSafari(): Observable<boolean> {
        return Observable.create((subscriber: Subscriber<boolean>) => {
            this.window.nativeWindow['safari'].pushNotification.requestPermission(
                this.safariSubscriptionEndpoint,
                'web.com.maciejtreder.angular-universal-pwa',
                null,
                (permission) => {
                    if (permission.permission === 'granted') {
                        subscriber.next(true);
                        this.appRef.tick();
                    } else {
                        subscriber.next(false);
                    }
                    this.checkSubscription();
                }
            );
        });
    }
}
