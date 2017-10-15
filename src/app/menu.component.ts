import { Component, OnInit } from '@angular/core';
import { NotificationService } from './services/notification.service';
import { WindowRef } from './windowRef';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

@Component({
    moduleId: module.id,
    selector: 'menu',
    template: `
        <a mat-raised-button routerLink="/"> <i class="material-icons">home</i> Home</a>
        <a mat-raised-button routerLink="/lazy">
            <i class="material-icons">free_breakfast</i> Lazy
        </a>
        <a mat-raised-button routerLink="/httpProxy">
            <i class="material-icons">merge_type</i> Http proxy demo
        </a>
        <a mat-raised-button (click)="toggleSubscription()" *ngIf="isRegistrationAvailable() | async">
            <i class="material-icons">message</i> {{subscribeText | async}}
        </a>
        <a mat-raised-button target="_blank" rel="noopener" href="https://github.com/maciejtreder/angular-universal-serverless">
            <i class="material-icons">code</i> Fork on github
        </a>
    `,
    styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
    public isRegistered: Observable<boolean> = this.ns.isRegistered();
    public isSafari: boolean = false;
    public subscribeText: Subject<string> = new ReplaySubject();
    private _isRegistered: boolean;

    constructor(private ns: NotificationService, private window: WindowRef) {}

    public ngOnInit(): void {
        this.isSafari = !!this.window.nativeWindow['safari'];
        this.isRegistered.subscribe((registered: boolean) => {
            registered ? this.subscribeText.next('Unsubscribe from push') : this.subscribeText.next('Subscribe to push');
            this._isRegistered = registered;
        });
    }

    public isRegistrationAvailable(): Observable<boolean> {
        if (this.isSafari) {
            return this.ns.isRegistered().map((registered) => !registered);
        } else if (this.ns.isPushAvailable()) {
            return Observable.of(true);
        }
        return Observable.of(false);
    }

    public toggleSubscription(): void {
        if (this._isRegistered) {
            this.ns.unregisterFromPush().subscribe();
        } else {
            this.ns.registerToPush().subscribe();
        }
    }
}
