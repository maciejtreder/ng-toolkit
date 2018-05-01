import { Component, HostBinding, Input, OnInit } from '@angular/core';
import { WindowRef } from '../window-ref.service';
import { Notifications } from '../services/notifications.service';
import { Observable, of, ReplaySubject, Subject } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'menu',
  templateUrl: 'menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  public isSafari: boolean = false;
  public subscribeText: Subject<string> = new ReplaySubject();
  public menuElements: MenuElement[] = [
    {link: '/donors', icon: 'attach_money', text: 'Donors'},
    {link: '/', icon: 'home', text: 'Home'},
    {link: '/lazy', icon: 'free_breakfast', text: 'Lazy module'},
    // {link: '/external', icon: 'call_merge', text: 'External module'}, //not works because of https://github.com/angular/angular-cli/issues/8284
    {link: '/transferState', icon: 'call_merge', text: 'TransferState (API calls)'},
    {link: 'https://github.com/maciejtreder/angular-universal-pwa', icon: 'code', text: 'Fork on github'},
  ];
  @Input('contextual')
  @HostBinding('class.contextual')
  public contextual: boolean = false;

  private _isRegistered: boolean;

  constructor(private ns: Notifications, private window: WindowRef) {}

  public ngOnInit(): void {
    this.isSafari = !!this.window.nativeWindow['safari'];
    this.ns.isSubscribed().subscribe((registered: boolean) => {
      registered ? this.subscribeText.next('Unsubscribe from push') : this.subscribeText.next('Subscribe to push');
      this._isRegistered = registered;
    });
  }

  public isRegistrationAvailable(): Observable<boolean> {
    if (this.isSafari) {
      return this.ns.isSubscribed().pipe(map((registered) => !registered));
    } else if (this.ns.isPushAvailable()) {
      return of(true);
    } else {
      return of(false);
    }
  }

  public toggleSubscription(): void {
    if (this._isRegistered) {
      this.ns.unsubscribeFromPush().subscribe();
    } else {
      this.ns.subscribeToPush().subscribe();
    }
  }
}

interface MenuElement {
  link: string;
  icon: string;
  text: string;
}
