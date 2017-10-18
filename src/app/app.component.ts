import { Component, OnInit, PLATFORM_ID, Inject, ElementRef, AfterViewInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { ConnectivityService } from 'ng-http-sw-proxy';

import { DeviceService } from './services/device.service';
import { ServiceWorkerService } from './services/service-worker.service';
import { SnackBarNotification, SnackBarService } from './services/snack-bar.service';
import { WindowRef } from './windowRef';

@Component({
  moduleId: module.id,
  selector: 'app',
  templateUrl: './app.component.html',
    styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {

    public isDesktop: boolean = this.deviceService.isDesktop();
    public navIsFixed: boolean = false;

    constructor(
        @Inject(PLATFORM_ID) private platformId: any,
        private conn: ConnectivityService,
        private deviceService: DeviceService,
        private sws: ServiceWorkerService,
        private elRef: ElementRef,
        private snackBarService: SnackBarService,
        private windowRef: WindowRef
    ) {}

    public ngAfterViewInit(): void {
        // "sticky" header
        if (!isPlatformBrowser(this.platformId) || !this.isDesktop) {
            return;
        }

        Observable.fromEvent(window, 'scroll').subscribe((e: Event) => this.onScroll());
        this.onScroll();
    }

    public ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.sws.update().filter((response) => response).subscribe(() => {
            this.snackBarService.displayNotification({message: 'New version of app is available!', action: 'Launch', force: true, callback: () => {
                this.windowRef.nativeWindow.location.reload(true);
            }} as SnackBarNotification);
        });

        let isOnline: boolean = true;
        this.conn.hasNetworkConnection()
            .filter((status: boolean) => status !== isOnline)
            .debounceTime(1000)
            .subscribe((status: boolean) => {
                isOnline = status;
                if (status === false) {
                    this.snackBarService.displayNotification({message: 'You are offline. All changes will be synced when you will go online again.', action: 'Close'} as SnackBarNotification);
                } else {
                    this.snackBarService.displayNotification({message: 'You are online. All data is synced.', action: 'Ok', duration: 3, force: true} as SnackBarNotification);
                }
            });
    }

    private onScroll(): void {
        const rect = this.elRef.nativeElement.querySelector('#content menu').getBoundingClientRect();
        this.navIsFixed = rect.top <  64;
    }
}
