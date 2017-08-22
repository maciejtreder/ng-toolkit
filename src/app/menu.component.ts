import { Component, Output, EventEmitter, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { ServiceWorkerService } from './services/service-worker.service';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Component({
    moduleId: module.id,
    selector: 'menu',
    template: `
        <a md-raised-button routerLink="/"> <i class="material-icons">home</i> Home</a>
        <a md-raised-button routerLink="/lazy">
            <i class="material-icons">free_breakfast</i> Lazy
        </a>
        <a md-raised-button routerLink="/httpProxy">
            <i class="material-icons">merge_type</i> Http proxy demo
        </a>
        <a md-raised-button (click)="subscribeToPush()" *ngIf="isPushAvailable() && !(isRegistered | async)">
            <i class="material-icons">message</i> Subscribe to push
        </a>
        <a md-raised-button (click)="unsubscribeFromPush()" *ngIf="(isRegistered | async) && !isSafari">
            <i class="material-icons">message</i> Unsubscribe from push
        </a>
        <a md-raised-button target="_blank" href="https://github.com/maciejtreder/angular-universal-serverless">
            <i class="material-icons">code</i> Fork on github
        </a>
    `,
    styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
    public isRegistered: Observable<boolean> = this.sws.isRegisteredToPush();
    public isSafari: boolean = false;
    private platformId: any;

    constructor(private sws: ServiceWorkerService, @Inject(PLATFORM_ID) platformId: any) {
        this.platformId = platformId;
    }

    public ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.isSafari = window['safari'];
    }

    public subscribeToPush(): void {
        this.sws.registerToPush();
    }

    public unsubscribeFromPush(): void {
        this.sws.unregisterFromPush();
    }

    public isPushAvailable(): boolean {
        return this.sws.isPushAvailable();
    }
}
