import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationService } from './services/notification.service';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

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
        <a md-raised-button target="_blank" rel="noopener" href="https://github.com/maciejtreder/angular-universal-serverless">
            <i class="material-icons">code</i> Fork on github
        </a>
    `,
    styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
    public isRegistered: BehaviorSubject<boolean> = new BehaviorSubject(false);
    public isSafari: boolean = false;

    constructor(private ns: NotificationService) {}

    public ngOnInit(): void {
        this.isRegistered.next(this.ns.isRegistered());
    }

    public subscribeToPush(): void {
        this.ns.registerToPush().subscribe((registered: boolean) => this.isRegistered.next(registered));
    }

    public unsubscribeFromPush(): void {
        this.ns.unregisterFromPush().subscribe((unregistered: boolean) => this.isRegistered.next(!unregistered));
    }

    public isPushAvailable(): boolean {
        return this.ns.isPushAvailable();
    }
}
