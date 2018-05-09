import { ApplicationRef, Inject, Injectable, Injector, PLATFORM_ID } from '@angular/core';
import { WindowRef } from '../window-ref.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { isPlatformBrowser } from '@angular/common';
import { from, Observable, Observer, of, Subscriber } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class Notifications {
  public endpoint: string = 'https://api.angular-universal-pwa.maciejtreder.com/webpush';
  public vapidSubscriptionEndpoint: string = this.endpoint + '/vapid';
  public safariSubscriptionEndpoint: string = this.endpoint + '/safari';

  private applicationServerKey: string =
    'BKxp6BwVzRWy1Qbe63rHNbG46uwPTrl1RoeTJuyVBm42kvlUk0RuSkYk8NKoO0QK2GNV7eRhOLyV1KfmZhwU9Sc';

  private swPush: SwPush;

  constructor(private window: WindowRef, @Inject(PLATFORM_ID) private platformId: any, private http: HttpClient, private appRef: ApplicationRef, private injector: Injector) {
    try {
      this.swPush = injector.get(SwPush);
      this.swPush.messages.subscribe((message) => console.log(message));
    } catch (err) {
      // workaround for https://github.com/angular/angular/issues/20407
    }
  }

  public isPushAvailable(): boolean {
    return isPlatformBrowser(this.platformId) && (this.isVapidPushAvaialable() || this.isSafariPushAvailable());
  }

  public isSubscribed(): Observable<boolean> {
    if (this.isVapidPushAvaialable()) {
      return this.swPush.subscription.pipe(map((subscription) => !!subscription));
    } else if (this.isSafariPushAvailable()) {
      return Observable.create((observer: Observer<boolean>) => {
        observer.next(this.window.nativeWindow['safari'].pushNotification.permission('web.com.maciejtreder.angular-universal-pwa').permission === 'granted');
      });
    } else {
      return of(false);
    }
  }

  public subscribeToPush(): Observable<boolean> {
    if (!this.isPushAvailable()) {
      throw new Error('Push is not available for this browser!');
    }
    if (this.isVapidPushAvaialable()) {
      return this.registerVapid();
    } else {
      return this.registerSafari();
    }
  }

  public unsubscribeFromPush(): Observable<boolean> {
    if (!this.isVapidPushAvaialable()) {
      throw new Error('Only VAPID push support programaticaly!');
    }

    let subscription: PushSubscription;

    return this.swPush.subscription.pipe(map((result: PushSubscription) => {
      return from(subscription.unsubscribe());
    })).pipe(() => {
      return this.http.post(this.vapidSubscriptionEndpoint + '/unsubscribe', subscription, {headers: new HttpHeaders().set('content-type', 'application/json'), observe: 'response'}).pipe(map((resp) => resp.status === 202, (err) => err.status === 202));
    });
  }

  private registerVapid(): Observable<boolean> {
    return Observable.create((subscriber: Subscriber<boolean>) => {
      this.swPush.requestSubscription({serverPublicKey: this.applicationServerKey}).then((pushSubscription: PushSubscription) => {
        this.http.post(this.vapidSubscriptionEndpoint + '/subscribe', JSON.stringify(pushSubscription), {headers: new HttpHeaders().set('content-type', 'application/json'), observe: 'response'})
          .subscribe((response) => {
            if (response.status !== 202) {
              pushSubscription.unsubscribe();
              subscriber.next(false);
            } else {
              subscriber.next(true);
            }
          }, (err) => {
            if (err.status !== 202) { // workaround for  https://github.com/angular/angular/issues/19555
              pushSubscription.unsubscribe();
              subscriber.next(false);
            } else {
              subscriber.next(true);
            }
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
          } else {
            subscriber.next(false);
          }
          this.appRef.tick();
        }
      );
    });
  }

  private isVapidPushAvaialable(): boolean {
    return !this.window.nativeWindow['safari'] && !!this.window.nativeWindow['navigator'] && !!this.window.nativeWindow.navigator['serviceWorker'];
  }

  private isSafariPushAvailable(): boolean {
    return !!this.window.nativeWindow['safari'] && !!this.window.nativeWindow['safari'].pushNotification;
  }
}
