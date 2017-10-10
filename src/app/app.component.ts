import { Component, OnInit, PLATFORM_ID, Inject, ElementRef, AfterViewInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { ConnectivityService } from 'ng-http-sw-proxy';

import { DeviceService } from './services/device.service';
import { ServiceWorkerService } from './services/service-worker.service';
import { MdSnackBar, MdSnackBarConfig } from '@angular/material';
import { Queue } from 'typescript-collections';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';

@Component({
  moduleId: module.id,
  selector: 'app',
  templateUrl: './app.component.html',
    styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {

    public isDesktop: boolean = this.deviceService.isDesktop();
    public navIsFixed: boolean = false;

    private snackBarNotificationsQueue: Queue<SnackBarNotification> = new Queue<SnackBarNotification>();
    private snackBarNotificationsForceQueue: Queue<SnackBarNotification> = new Queue<SnackBarNotification>();
    private actuallyDisplayedNotification: SnackBarNotification = null;
    private snackbarOpened: boolean = false;

    constructor(
        @Inject(PLATFORM_ID) private platformId: any,
        private conn: ConnectivityService,
        private deviceService: DeviceService,
        private sws: ServiceWorkerService,
        private elRef: ElementRef,
        private snackBar: MdSnackBar
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
            this.addToNotificationQueue({message: 'New version of app is available!', action: 'Launch', force: true} as SnackBarNotification);
        });

        let isOnline: boolean = true;
        this.conn.hasNetworkConnection()
            .filter((status: boolean) => status !== isOnline)
            .debounceTime(1000)
            .subscribe((status: boolean) => {
                isOnline = status;
                if (status === false) {
                    this.addToNotificationQueue({message: 'You are offline. All changes will be synced when you will go online again.', action: 'Close'} as SnackBarNotification);
                } else {
                    this.addToNotificationQueue({message: 'You are online. All data is synced.', action: 'Ok', duration: 3, force: true} as SnackBarNotification);
                }
            });
    }

    private addToNotificationQueue(notification: SnackBarNotification): void {
        if (notification.force) {
            this.snackBarNotificationsForceQueue.enqueue(notification);
        } else {
            this.snackBarNotificationsQueue.enqueue(notification);
        }
        this.displayNotification();
    }

    private loadNotificationToDisplay(): void {
        if (this.snackBarNotificationsForceQueue.size() > 0) {
            this.actuallyDisplayedNotification = this.snackBarNotificationsForceQueue.dequeue();
        } else if (this.snackBarNotificationsQueue.size() > 0) {
            this.actuallyDisplayedNotification = this.snackBarNotificationsQueue.dequeue();
        } else {
            this.actuallyDisplayedNotification = null;
            return;
        }
    }

    private displayNotification(): void {
        if (this.snackbarOpened) {
            if (!this.actuallyDisplayedNotification.force && this.snackBarNotificationsForceQueue.size() > 0) {
                this.snackBar.dismiss();
            }
            return;
        }
        this.loadNotificationToDisplay();
        if (this.actuallyDisplayedNotification == null) {
            return;
        }

        this.snackbarOpened = true;

        const config: MdSnackBarConfig = new MdSnackBarConfig();
        config.duration = 1000 * this.actuallyDisplayedNotification.duration;
        config.extraClasses = ['service_worker_snack'];
        const callback = this.actuallyDisplayedNotification.callback;

        this.snackBar.open(this.actuallyDisplayedNotification.message, this.actuallyDisplayedNotification.action, config).afterDismissed().subscribe(() => {
            if (callback) {
                callback();
            }
            this.snackbarOpened = false;
            this.displayNotification();
        });
    }

    private onScroll(): void {
        const rect = this.elRef.nativeElement.querySelector('#content menu').getBoundingClientRect();
        this.navIsFixed = rect.top <  64;
    }
}

interface SnackBarNotification {
    message: string;
    action: string;
    duration: number;
    callback: () => void;
    force: boolean;
}
