import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuComponent } from './menu.component';
import { By } from '@angular/platform-browser';
import * as sinon from 'sinon';
import { DebugElement, Directive, HostListener, Input } from '@angular/core';
import { MatMenuModule } from '@angular/material';
import { WindowRef } from '../window-ref.service';
import { Notifications } from '../services/notifications.service';
import { Subject, BehaviorSubject, of } from 'rxjs';

@Directive({
  selector: '[routerLink]'
})
class RouterLinkStubDirective {

  public navigatedTo: any = null;
  @Input()
  private routerLink: any;

  @HostListener('click')
  public onClick(): void {
    this.navigatedTo = this.routerLink;
  }
}

let fixture: ComponentFixture<MenuComponent>;
let nsServiceStub;
const windowRefStub = sinon.createStubInstance(WindowRef);

const isRegistered: Subject<boolean> = new BehaviorSubject(false);

let homeLink;
let lazyLink;
let proxyLink;
let forkLink;
let subscribeLink;

const findSubscribeLink = () => {
  fixture.detectChanges();
  subscribeLink = fixture.debugElement.queryAll(By.css('a')).find((de: DebugElement) => de.nativeElement.textContent.includes('Subscribe to push') || de.nativeElement.textContent.includes('Unsubscribe from push'));
};

const setupTestBed = () => {
  nsServiceStub = sinon.createStubInstance(Notifications);
  nsServiceStub.isSubscribed.returns(isRegistered);
  nsServiceStub.isPushAvailable.returns(true);

  TestBed.configureTestingModule({
    imports: [MatMenuModule],
    declarations: [MenuComponent, RouterLinkStubDirective],
    providers: [
      {provide: Notifications, useValue: nsServiceStub},
      {provide: WindowRef, useValue: windowRefStub}
    ]
  });

  fixture = TestBed.createComponent(MenuComponent);
  fixture.detectChanges();
};

describe('Menu component.', () => {

  beforeEach(() => {
    isRegistered.next(false);
    windowRefStub._window = {
      on: (name, handler) => {
        // noop
      },
      off: () => {
        // noop
      }
    };
    setupTestBed();

    findSubscribeLink();
    const anchors: DebugElement[] = fixture.debugElement.queryAll(By.css('a'));

    homeLink = anchors.find((de: DebugElement) => de.nativeElement.textContent.includes('Home'));
    lazyLink = anchors.find((de: DebugElement) => de.nativeElement.textContent.includes('Lazy'));
    proxyLink = anchors.find((de: DebugElement) => de.nativeElement.textContent.includes('Http proxy demo'));
    forkLink = anchors.find((de: DebugElement) => de.nativeElement.textContent.includes('Fork on github'));
  });

  it('Home link should be displayed', () => {
    expect(homeLink).toBeTruthy();
  });

  it('Lazy module link should be displayed', () => {
    expect(lazyLink).toBeTruthy();
  });

  it('Should display fork link', () => {
    expect(forkLink).toBeTruthy();
  });

  it('Should display subscribe link when subscription is available', () => {
    expect(subscribeLink.nativeElement.textContent).toContain('Subscribe to push');
  });

  it('Should not display subscribe link when subscription is not available', async(() => {
    nsServiceStub.isPushAvailable.returns(false);
    findSubscribeLink();
    expect(subscribeLink).toBeFalsy();
  }));

  it('When subscribe link is clicked, then subscribe method should be called', async(() => {
    nsServiceStub.subscribeToPush.returns(of(true));
    subscribeLink.nativeElement.click();
    expect(nsServiceStub.subscribeToPush.calledOnce).toBe(true, 'Register to push method was not called.');
  }));

  it('Subscribe button value should be switch depending on isSubscribed observable', async(() => {
    expect(subscribeLink.nativeElement.textContent).toContain('Subscribe to push');
    isRegistered.next(true);
    fixture.detectChanges();
    expect(subscribeLink.nativeElement.textContent).toContain('Unsubscribe from push');
  }));
});

describe('Safari', () => {
  beforeEach(() => {
    isRegistered.next(false);
    windowRefStub._window = {
      on: (name, handler) => {
        // noop
      },
      off: () => {
        // noop
      },
      safari: {}
    };
    setupTestBed();
  });

  it('Subscribe button should be visible on Safari', async(() => {
    findSubscribeLink();
    expect(subscribeLink.nativeElement.textContent).toContain('Subscribe to push', 'Message on the button is incorrect');
  }));

  it('Unsubscribe button should not be visible on Safari', async(() => {
    isRegistered.next(true);
    findSubscribeLink();
    expect(subscribeLink).toBeUndefined('Button should disappear');
  }));
});
