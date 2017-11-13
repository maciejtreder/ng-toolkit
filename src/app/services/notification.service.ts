import { ApplicationRef, Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { WindowRef } from '../windowRef';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';
import { PartialObserver } from 'rxjs/Observer';

@Injectable()
export class NotificationService {

    public endpoint: string = 'https://api.angular-universal-pwa.maciejtreder.com/webpush';
    public vapidSubscriptionEndpoint: string = this.endpoint + '/vapid';
    public safariSubscriptionEndpoint: string = this.endpoint + '/safari';

    private _isSubscribed: boolean;
    private _isSubscribedObs: Subject<boolean> = new BehaviorSubject(false);
    private applicationServerKey: string =
        'BKxp6BwVzRWy1Qbe63rHNbG46uwPTrl1RoeTJuyVBm42kvlUk0RuSkYk8NKoO0QK2GNV7eRhOLyV1KfmZhwU9Sc';
    private subscription: PushSubscription;

    constructor(private window: WindowRef, @Inject(PLATFORM_ID) private platformId: any, private http: HttpClient, private appRef: ApplicationRef, private swPush: SwPush) {
        this.checkSubscription();
    }

    public isPushAvailable(): boolean {
        return isPlatformBrowser(this.platformId) && (this.isVapidPushAvaialable() || this.isSafariPushAvailable());
    }

    public registerToPush(): Observable<boolean> {
        if (!this.isPushAvailable()) {
            return Observable.of(false);
        }
        if (this._isSubscribed) {
            return Observable.create((subscriber: Subscriber<boolean>) => subscriber.error('Another registration is pending or active.'));
        }
        this._isSubscribed = true; // for locking purpose, only one subscription try at time.
        if (this.isVapidPushAvaialable()) {
            this.registerVapid().subscribe();
        } else {
            this.registerSafari().subscribe();
        }
        return this._isSubscribedObs;
    }

    public isRegistered(): Observable<boolean> {
        return this._isSubscribedObs;
    }

    public unregisterFromPush(): Observable<boolean> {
        if (this.isVapidPushAvaialable() && this._isSubscribed) {
            return Observable.create((subscriber: Subscriber<boolean>) => {
                this.subscription.unsubscribe().then(() => {
                    this.http.post(this.vapidSubscriptionEndpoint + '/unsubscribe', JSON.stringify(this.subscription), {headers: new HttpHeaders().set('content-type', 'application/json')}).subscribe((res) => console.log(res));
                    this.checkSubscription();
                });
            });
        }
        return Observable.of(false);
    }

    private checkSubscription(): void {
        if (this.isVapidPushAvaialable()) {
            this.swPush.subscription.subscribe((subscription: PushSubscription) => {
                this.subscription = subscription;
                console.log('checkSubscription', JSON.stringify(this.subscription));
                this._isSubscribed = !!this.subscription;
                this._isSubscribedObs.next(!!this.subscription);
            });
        } else if (this.isSafariPushAvailable()) {
            const result = this.window.nativeWindow['safari'].pushNotification.permission(
                'web.com.maciejtreder.angular-universal-pwa'
            );
            this._isSubscribed = result.permission === 'granted';
        } else {
            this._isSubscribed = false;
        }
        this._isSubscribedObs.next(this._isSubscribed);
    }

    private registerVapid(): Observable<boolean> {
        return Observable.create((subscriber: Subscriber<boolean>) => {
            this.swPush.requestSubscription({serverPublicKey: this.applicationServerKey}).then((pushSubscription: PushSubscription) => {
                this.http.post(this.vapidSubscriptionEndpoint + '/subscribe', JSON.stringify(pushSubscription), {headers: new HttpHeaders().set('content-type', 'application/json'), observe: 'response'})
                    .subscribe((response) => {
                        console.log('response', response);
                        if (response.status !== 202) {
                            pushSubscription.unsubscribe();
                            // localStorage.setItem('subscription', JSON.stringify(pushSubscription));
                        }
                        this.checkSubscription();
                    }, (err) => {
                        console.log('error', err);
                        if (err.status !== 202) { // work-around for  https://github.com/angular/angular/issues/19555
                            pushSubscription.unsubscribe();
                        }
                        this.checkSubscription();
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

    private isVapidPushAvaialable(): boolean {
        return !!this.window.nativeWindow['navigator'] && this.window.nativeWindow.navigator['serviceWorker'];
    }

    private isSafariPushAvailable(): boolean {
        return !!this.window.nativeWindow['safari'] && !!this.window.nativeWindow['safari'].pushNotification;
    }
}
