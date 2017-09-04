import { PLATFORM_ID, Injectable, Inject, ApplicationRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgServiceWorker, NgPushRegistration } from '@angular/service-worker';
import { Observable, BehaviorSubject } from 'rxjs';
import { RequestOptions, Headers, RequestOptionsArgs, Http, Response } from '@angular/http';
import { SnackBarService } from './snack-bar.service';

@Injectable()
export class ServiceWorkerService {

    private updateInfoDisplayed: boolean = false;
    private subscribed: boolean = false;
    private platformId: any;
    private isRegisteredToPushObs: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    private apiEndpoint: string =
        'https://api.angular-universal-serverless.maciejtreder.com/webpush';
    private applicationServerKey: string =
        'BKxp6BwVzRWy1Qbe63rHNbG46uwPTrl1RoeTJuyVBm42kvlUk0RuSkYk8NKoO0QK2GNV7eRhOLyV1KfmZhwU9Sc';

    constructor(
        private snackBarService: SnackBarService,
        private sw: NgServiceWorker,
        private http: Http,
        @Inject(PLATFORM_ID) platformId: any,
        private appRef: ApplicationRef
    ) {
        this.platformId = platformId;
        if (this.isPushAvailable()) {
            this.isRegisteredToPushObs.next(this.isRegistered());
        }
        if ( !isPlatformBrowser(this.platformId) ||
            !(process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) ||
            localStorage.getItem('cache_done') === 'true'
        ) {
            return;
        }

        let interval;
        interval = setInterval(() => {
            navigator['serviceWorker']
                .getRegistrations()
                .then((registrations) => {
                    return registrations
                        .map((reg) => {
                            return {
                                scope: reg.scope,
                                active: !!reg.active,
                                installing: !!reg.installing,
                                waiting: !!reg.waiting
                            };
                        });
                }).then((value) => {
                    if (value[0] && value[0].active === true) {
                        clearInterval(interval);
                        localStorage.setItem('cache_done', 'true');

                        this.snackBarService.showMessage(
                            'Caching complete! Future visits will work offline', 'Ok', 5000);
                    }
                });
        }, 100);
        setTimeout(() => clearInterval(interval), 10000); // installation check timeout
    }

    public checkForUpdates(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.sw.checkForUpdate()
            .filter((update) => update)
            .flatMap(() => this.sw.updates)
            .map((updateEvent) => updateEvent.version)
            .flatMap((ver) => this.sw.activateUpdate(ver))
            .subscribe((result) => this.displayUpdateMessage());

        if (this.subscribed) {
            return;
        }

        this.subscribed = true;

        this.sw.push
            .filter((msg) => msg.notification.title === 'New version available')
            .subscribe(() => this.checkForUpdates());

        this.sw.log()
            .map((log: any) => log.message)
            .filter((message) => message && message.indexOf('caching from network') > -1)
            .first()
            .subscribe(() => this.displayUpdateMessage());
    }

    public isPushAvailable(): boolean {
        if (isPlatformBrowser(this.platformId)) {
            if (window['safari'] && window['safari'].pushNotification) {
                return true;
            }
            if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
                return true;
            }
        }
        return false;
    }

    public isRegisteredToPush(): Observable<boolean> {
        return this.isRegisteredToPushObs;
    }

    public registerToPush(): void {
        this.sw.registerForPush({applicationServerKey: this.applicationServerKey})
            .subscribe((pushRegistration: NgPushRegistration) => {
            const headers: Headers = new Headers();
            headers.append('content-type', 'application/json');
            const options: RequestOptionsArgs = new RequestOptions({headers});
            this.http.post(
                this.apiEndpoint + '/vapid/subscribe',
                JSON.stringify(pushRegistration),
                options
            ).subscribe((res: Response) => {
                if (res.status === 202) {
                    this.isRegisteredToPushObs.next(true);
                    localStorage.setItem('subscription', JSON.stringify(pushRegistration));
                }
            }, (err) => console.log('error!!!', err));
        }, (err) => {
            console.error('error during register for push', err);
        });

        if (window['safari'] && window['safari'].pushNotification) {
            window['safari'].pushNotification.requestPermission(
                this.apiEndpoint + '/safari',
                'web.com.maciejtreder.angular-universal-serverless',
                null,
                (permission) => {
                    if (permission.permission === 'granted') {
                        this.isRegisteredToPushObs.next(true);
                        this.appRef.tick();
                    }
                }
            );
        }
    }

    public unregisterFromPush(): void {
        if (!this.isRegistered()) {
            return;
        }
        if (window['safari']) {
            const result = window['safari'].pushNotification.permission(
                'web.com.maciejtreder.angular-universal-serverless'
            );
            console.log(window['safari'].pushNotification);
        } else {
            this.sw.registerForPush({applicationServerKey: this.applicationServerKey})
                .subscribe((subscription: NgPushRegistration) => {
                subscription.unsubscribe().subscribe((result) => {
                    if (result) {
                        const headers: Headers = new Headers();
                        headers.append('content-type', 'application/json');
                        const options: RequestOptionsArgs = new RequestOptions({headers});
                        this.http.post(
                            this.apiEndpoint + '/vapid/unsubscribe',
                            JSON.stringify(subscription),
                            options
                        ).subscribe((res: Response) => {
                            if (res.status === 202) {
                                localStorage.removeItem('subscription');
                                this.isRegisteredToPushObs.next(false);
                            }
                        });
                    }
                });
            });
        }
    }

    /**
     * Wrapper for action invoked, when new files appear
     * or new version of service-worker is installed.
     */
    private displayUpdateMessage(): void {
        if (this.updateInfoDisplayed) {
            return;
        }
        this.updateInfoDisplayed = true;
        this.snackBarService.showMessage(
            'New version of application installed',
            'Reload now',
            -1,
            () => window.location.reload(),
            true
        );
    }

    private isRegistered(): boolean {
        if (!this.isPushAvailable()) {
            return false;
        }
        if (window['safari']) {
            const result = window['safari'].pushNotification.permission(
                'web.com.maciejtreder.angular-universal-serverless'
            );
            return result.permission === 'granted';
        } else {
            if (localStorage.getItem('subscription')) {
                return true;
            }
            return false;
        }
    }
}
