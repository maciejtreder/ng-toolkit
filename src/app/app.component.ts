import { Component, OnInit, PLATFORM_ID, Inject, ElementRef, AfterViewInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { ConnectivityService } from 'ng-http-sw-proxy';

import { DeviceService } from './services/device.service';
import { SnackBarService } from './services/snack-bar.service';
import { ServiceWorkerService } from './services/service-worker.service';
import { NotificationService } from './services/notification.service';

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
        private snackBarService: SnackBarService,
        private conn: ConnectivityService,
        private deviceService: DeviceService,
        private sws: ServiceWorkerService,
        private elRef: ElementRef
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
        console.log('new version output 2');
        this.sws.update().subscribe((response) => console.log('update subscribe', response));

        let isOnline: boolean = true;
        this.conn.hasNetworkConnection()
            .filter((status: boolean) => status !== isOnline)
            .debounceTime(1000)
            .subscribe((status: boolean) => {
                isOnline = status;
                if (status === false) {
                    this.snackBarService.showMessage(
                        'You are offline. All changes will be synced when you will go online again.',
                        'Close'
                    );
                } else {
                    this.snackBarService.showMessage('You are online. All data is synced.', 'Ok', 3000);
                }
            });
    }

    private onScroll(): void {
        const rect = this.elRef.nativeElement.querySelector('#content menu').getBoundingClientRect();
        this.navIsFixed = rect.top <  64;
    }
}
