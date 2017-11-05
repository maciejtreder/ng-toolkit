import {
    AfterViewInit, Component, DebugElement, ElementRef, HostBinding, Inject, Input, OnInit,
    PLATFORM_ID
} from '@angular/core';
import { NotificationService } from './services/notification.service';
import { WindowRef } from './windowRef';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import { isPlatformBrowser } from '@angular/common';
import { By } from '@angular/platform-browser';

@Component({
    selector: 'menu',
    templateUrl: 'menu.component.html',
    styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit, AfterViewInit {
    public isRegistered: Observable<boolean> = this.ns.isRegistered();
    public isSafari: boolean = false;
    public subscribeText: Subject<string> = new ReplaySubject();
    public menuElements: MenuElement[] = [
        {link: '/', icon: 'home', text: 'Home'},
        {link: '/lazy', icon: 'free_breakfast', text: 'Lazy module'},
        {link: '/external', icon: 'call_merge', text: 'External module'},
        {link: '/httpProxy', icon: 'merge_type', text: 'Http proxy demo'},
        {link: 'https://github.com/maciejtreder/angular-universal-serverless', icon: 'code', text: 'Fork on github'},
        ];
    @Input('vertical')
    @HostBinding('class.side-nav')
    public vertical: boolean = false;

    public displayArrows: Observable<boolean>;

    private _isRegistered: boolean;
    private toScroll: number = 0;

    constructor(private ns: NotificationService, private window: WindowRef, @Inject(PLATFORM_ID) private platformId: any, private elRef: ElementRef) {}

    public ngOnInit(): void {
        this.isSafari = !!this.window.nativeWindow['safari'];
        this.isRegistered.subscribe((registered: boolean) => {
            registered ? this.subscribeText.next('Unsubscribe from push') : this.subscribeText.next('Subscribe to push');
            this._isRegistered = registered;
        });
    }

    public ngAfterViewInit(): void {
        if (isPlatformBrowser(this.platformId) && !this.vertical) {
            const listLength = this.elRef.nativeElement.querySelector('ul').getBoundingClientRect().width;
            setTimeout(() => {
                this.displayArrows = Observable.merge(Observable.fromEvent(this.window.nativeWindow, 'resize'), Observable.of('doesn\'t matter'))
                    .map(() => this.elRef.nativeElement.getBoundingClientRect().width)
                    .map((visibleLength) => visibleLength < listLength);
                this.displayArrows.filter((v) => !v).subscribe(() => this.elRef.nativeElement.querySelector('ul').style.left = '0px');
            });
        }
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

    public scrollLeft(): void {
        const visibleAreaEnd = this.elRef.nativeElement.querySelector('span#right_arrow').getBoundingClientRect().x;
        let rightBorder;
        const BreakException = {};
        let scrollRange: number = 0;
        try {
            this.elRef.nativeElement.querySelectorAll('li').forEach((element) => {
                rightBorder = element.getBoundingClientRect().x + element.getBoundingClientRect().width;
                if (rightBorder > visibleAreaEnd) {
                    scrollRange = rightBorder - visibleAreaEnd;
                    throw BreakException;
                }
            });
        } catch (e) {
            if (e !== BreakException) {
                throw e;
            }
        }
        this.scroll(scrollRange);
    }

    public scrollRight(): void {
        const visibleAreaStart = this.elRef.nativeElement.querySelector('span#left_arrow').getBoundingClientRect().x + this.elRef.nativeElement.querySelector('span#left_arrow').getBoundingClientRect().width;
        let leftBorder: number;
        let scrollRange: number = 0;
        this.elRef.nativeElement.querySelectorAll('li').forEach((element) => {
            leftBorder = element.getBoundingClientRect().x;
            if (leftBorder < visibleAreaStart) {
                scrollRange = visibleAreaStart - leftBorder;
            }
        });
        this.scroll(-scrollRange);
    }

    private scroll(value: number): void {
        this.toScroll += value;
        const animationDuration = Math.abs(value) * 5;
        this.elRef.nativeElement.querySelector('ul').style.transition = animationDuration + 'ms left';
        this.elRef.nativeElement.querySelector('ul').style.left = '-' + this.toScroll + 'px';
    }
}

interface MenuElement {
    link: string;
    icon: string;
    text: string;
}
