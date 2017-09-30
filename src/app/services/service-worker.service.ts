import { PLATFORM_ID, Injectable, Inject, ApplicationRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgServiceWorker, NgPushRegistration } from '@angular/service-worker';
import { Observable, BehaviorSubject, Subscriber } from 'rxjs';
import { RequestOptions, Headers, RequestOptionsArgs, Http, Response } from '@angular/http';
import { WindowRef } from '../windowRef';
// import { SnackBarService } from './snack-bar.service';

@Injectable()
export class ServiceWorkerService {

    constructor(
        private sw: NgServiceWorker,
        @Inject(PLATFORM_ID) private platformId: any,
        private window: WindowRef
    ) {}

    public isServiceWorkerAvailable(): boolean {
        return (isPlatformBrowser(this.platformId) && 'serviceWorker' in this.window.nativeWindow.navigator);
    }

    public update(): Observable<boolean> {
        if (!this.isServiceWorkerAvailable()) {
            return Observable.of(false);
        }
        return Observable.create((subscriber: Subscriber<boolean>) => {
            this.sw.checkForUpdate().subscribe((isAvailable: boolean) => {
                if (isAvailable) {
                   this.sw.updates
                       .filter((updateEvent) => updateEvent.type === 'pending')
                       .map((updateEvent) => updateEvent.version)
                       .flatMap((version: string) => {
                            return this.sw.activateUpdate(version);
                       }).subscribe(() => {
                            subscriber.next(isAvailable);
                        });
               } else {
                   subscriber.next(isAvailable);
               }
           });
        });
    }

    // public registerToPush(): void {
    //     this.sw.registerForPush({applicationServerKey: this.applicationServerKey})
    //         .subscribe((pushRegistration: NgPushRegistration) => {
    //         const headers: Headers = new Headers();
    //         headers.append('content-type', 'application/json');
    //         const options: RequestOptionsArgs = new RequestOptions({headers});
    //         this.http.post(
    //             this.apiEndpoint + '/vapid/subscribe',
    //             JSON.stringify(pushRegistration),
    //             options
    //         ).subscribe((res: Response) => {
    //             if (res.status === 202) {
    //                 this.isRegisteredToPushObs.next(true);
    //                 localStorage.setItem('subscription', JSON.stringify(pushRegistration));
    //             }
    //         }, (err) => console.log('error!!!', err));
    //     }, (err) => {
    //         console.error('error during register for push', err);
    //     });
    //
    //     if (window['safari'] && window['safari'].pushNotification) {
    //         window['safari'].pushNotification.requestPermission(
    //             this.apiEndpoint + '/safari',
    //             'web.com.maciejtreder.angular-universal-serverless',
    //             null,
    //             (permission) => {
    //                 if (permission.permission === 'granted') {
    //                     this.isRegisteredToPushObs.next(true);
    //                     this.appRef.tick();
    //                 }
    //             }
    //         );
    //     }
    // }
    //
    // public unregisterFromPush(): void {
    //     if (!this.isRegistered()) {
    //         return;
    //     }
    //     if (window['safari']) {
    //         const result = window['safari'].pushNotification.permission(
    //             'web.com.maciejtreder.angular-universal-serverless'
    //         );
    //         console.log(window['safari'].pushNotification);
    //     } else {
    //         this.sw.registerForPush({applicationServerKey: this.applicationServerKey})
    //             .subscribe((subscription: NgPushRegistration) => {
    //             subscription.unsubscribe().subscribe((result) => {
    //                 if (result) {
    //                     const headers: Headers = new Headers();
    //                     headers.append('content-type', 'application/json');
    //                     const options: RequestOptionsArgs = new RequestOptions({headers});
    //                     this.http.post(
    //                         this.apiEndpoint + '/vapid/unsubscribe',
    //                         JSON.stringify(subscription),
    //                         options
    //                     ).subscribe((res: Response) => {
    //                         if (res.status === 202) {
    //                             localStorage.removeItem('subscription');
    //                             this.isRegisteredToPushObs.next(false);
    //                         }
    //                     });
    //                 }
    //             });
    //         });
    //     }
    // }
    //
    // private isRegistered(): boolean {
    //     if (!this.isPushAvailable()) {
    //         return false;
    //     }
    //     if (window['safari']) {
    //         const result = window['safari'].pushNotification.permission(
    //             'web.com.maciejtreder.angular-universal-serverless'
    //         );
    //         return result.permission === 'granted';
    //     } else {
    //         if (localStorage.getItem('subscription')) {
    //             return true;
    //         }
    //         return false;
    //     }
    // }
}
