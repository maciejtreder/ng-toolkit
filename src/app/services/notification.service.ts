import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { ServiceWorkerService } from './service-worker.service';
import { NgPushRegistration, NgServiceWorker } from '@angular/service-worker';
import { WindowRef } from '../windowRef';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs/Observable';
import { RequestOptions, RequestOptionsArgs, Headers, Http, Response } from '@angular/http';
import { Subscriber } from 'rxjs/Subscriber';

@Injectable()
export class NotificationService {

    public endpoint: string = 'https://api.angular-universal-serverless.maciejtreder.com/webpush';
    public vapidSubscriptionEndpoint: string = this.endpoint + '/vapid/';
    public safariSubscriptionEndpoint: string = this.endpoint + '/safari';

    private _isSubscribed: boolean;
    private applicationServerKey: string =
        'BKxp6BwVzRWy1Qbe63rHNbG46uwPTrl1RoeTJuyVBm42kvlUk0RuSkYk8NKoO0QK2GNV7eRhOLyV1KfmZhwU9Sc';
    private subscription: NgPushRegistration;
    private options: RequestOptionsArgs;

    constructor(private window: WindowRef, private serviceWorkerService: ServiceWorkerService, @Inject(PLATFORM_ID) private platformId: any, private serviceWorker: NgServiceWorker, private http: Http) {
        this.checkSubscription();
        const headers: Headers = new Headers();
        headers.append('content-type', 'application/json');
        this.options = new RequestOptions({headers});
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

    public isRegistered(): boolean {
        return this.isPushAvailable() && this._isSubscribed;
    }

    public unregisterFromPush(): Observable<boolean> {
        if (this.serviceWorkerService.isServiceWorkerAvailable() && this.isRegistered()) {
            return Observable.create((subscriber: Subscriber<boolean>) => {
                this.http.post(this.vapidSubscriptionEndpoint + '/unsubscribe', JSON.stringify(this.subscription), this.options).subscribe(() => {
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
                'web.com.maciejtreder.angular-universal-serverless'
            );
            this._isSubscribed = result.permission === 'granted';
        } else if (this.serviceWorkerService.isServiceWorkerAvailable()) {
            this.subscription = JSON.parse(localStorage.getItem('subscription'));
            this._isSubscribed = !!this.subscription;
        } else {
            this._isSubscribed = false;
        }
    }

    private registerVapid(): Observable<boolean> {
        return Observable.create((subscriber: Subscriber<boolean>) => {
            this.serviceWorker
                .registerForPush({applicationServerKey: this.applicationServerKey})
                .subscribe((pushRegistration: NgPushRegistration) => {
                    this.http.post(this.vapidSubscriptionEndpoint + '/subscribe', JSON.stringify(pushRegistration), this.options)
                        .subscribe((response: Response) => {
                            if (response.status === 202) {
                                localStorage.setItem('subscription', JSON.stringify(pushRegistration));
                            } else {
                                pushRegistration.unsubscribe().subscribe();
                            }
                            this.checkSubscription();
                            subscriber.next(this.isRegistered());
                        });
                });
        });
    }

    private registerSafari(): Observable<boolean> {
        return Observable.create((subscriber: Subscriber<boolean>) => {
            this.window.nativeWindow['safari'].pushNotification.requestPermission(
                this.safariSubscriptionEndpoint,
                'web.com.maciejtreder.angular-universal-serverless',
                null,
                (permission) => {
                    if (permission.permission === 'granted') {
                        subscriber.next(true);
                    } else {
                        subscriber.next(false);
                    }
                    this.checkSubscription();
                }
            );
        });
    }
}
