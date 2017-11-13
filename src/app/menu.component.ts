import {
    AfterViewInit, Component, DebugElement, ElementRef, HostBinding, Inject, Input, OnInit,
    PLATFORM_ID
} from '@angular/core';
import { WindowRef } from './windowRef';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import { isPlatformBrowser } from '@angular/common';
import { NotificationService } from './services/notification.service';

@Component({
    selector: 'menu',
    templateUrl: 'menu.component.html',
    styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
    public isRegistered: Observable<boolean> = this.ns.isRegistered();
    public isSafari: boolean = false;
    public subscribeText: Subject<string> = new ReplaySubject();
    public menuElements: MenuElement[] = [
        {link: '/', icon: 'home', text: 'Home'},
        {link: '/lazy', icon: 'free_breakfast', text: 'Lazy module'},
        {link: '/external', icon: 'call_merge', text: 'External module'},
        // {link: '/httpProxy', icon: 'merge_type', text: 'Http proxy demo'},
        {link: 'https://github.com/maciejtreder/angular-universal-serverless', icon: 'code', text: 'Fork on github'},
        ];
    @Input('vertical')
    @HostBinding('class.side-nav')
    public vertical: boolean = false;

    private _isRegistered: boolean;

    constructor(
        private ns: NotificationService,
        private window: WindowRef, @Inject(PLATFORM_ID) private platformId: any) {}

    public ngOnInit(): void {
        this.isSafari = !!this.window.nativeWindow['safari'];
        this.ns.isRegistered().subscribe((registered: boolean) => {
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

interface MenuElement {
    link: string;
    icon: string;
    text: string;
}
