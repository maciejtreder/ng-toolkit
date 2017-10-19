import { PLATFORM_ID, Injectable, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgServiceWorker } from '@angular/service-worker';
import { Observable, Subscriber } from 'rxjs';
import { WindowRef } from '../windowRef';

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

    public isCached(): Observable<any> {
        if (!this.isServiceWorkerAvailable()) {
            return Observable.of(false);
        }
        return Observable.fromPromise(this.window.nativeWindow.navigator.serviceWorker.ready)
            .filter((registration: ServiceWorkerRegistration) => registration.active != null)
            .map((serviceWorker: ServiceWorkerRegistration) => serviceWorker.active.state === 'activated');
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
}
