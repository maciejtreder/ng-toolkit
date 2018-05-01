import { async, fakeAsync, inject, TestBed, tick } from '@angular/core/testing';
import * as sinon from 'sinon';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WindowRef } from '../window-ref.service';
import { Notifications } from './notifications.service';
import { BehaviorSubject, of } from 'rxjs';

describe('Notification service spec.', () => {
  let httpStub;
  let windowStub;
  let swPushStub;

  const pushSubscription1 = {ps: {endpoint: 'http://endpoint.com/123'}, unsubscribe: () => new Promise((resolve) => resolve(true))};
  const pushSubscription2 = {ps: {endpoint: 'http://endpoint.com/321'}, unsubscribe: () => new Promise((resolve) => resolve(true))};

  beforeEach(() => {
    httpStub = sinon.createStubInstance(HttpClient);
    windowStub = sinon.createStubInstance(WindowRef);
    swPushStub = sinon.createStubInstance(SwPush);
    swPushStub.subscription = new BehaviorSubject(null);
    swPushStub.requestSubscription.returns(new Promise((resolve) => resolve(pushSubscription1)));

    windowStub._window = {navigator: {
      userAgent: 'test',
      serviceWorker: {}
    }};
  });

  const setUpTestBed = () => {
    TestBed.configureTestingModule({
      providers: [
        Notifications,
        { provide: WindowRef, useValue: windowStub },
        { provide: SwPush, useValue: swPushStub }
      ],
      imports: [
        HttpClientModule,
        HttpClientTestingModule
      ]
    });
  };

  describe('No push support + general tests', () => {
    beforeEach(() => {
      windowStub._window = {navigator: {
        userAgent: 'test',
      }};
      setUpTestBed();
    });

    it('Should construct', async(inject([Notifications], (ns) => {
      expect(ns).toBeDefined();
    })));

    it( 'Should respond as not subscribed', async(inject([Notifications], (ns: Notifications) => {
      let isRegistered;
      ns.isSubscribed().subscribe((resp) => isRegistered = resp);
      expect(isRegistered).toBe(false, 'Not subscribed client responses as subscribed.');
    })));

    it('Should not be able to subscribe if push is available before subscribing', async(inject([Notifications], (ns: Notifications) => {
      const spy = sinon.spy(ns, 'isPushAvailable');
      let errorThrown: boolean = false;
      try {
        ns.subscribeToPush().subscribe();
      } catch (error) {
        errorThrown = true;
      }
      expect(spy.calledOnce).toBe(true, 'Did not check if subscription is available');
      expect(errorThrown).toBe(true, 'Error was not thrown when there is no support for subscriptions.');
    })));
  });

  describe('VAPID -', () => {
    beforeEach(() => {
      httpStub.post.returns(of({status: 202}));
      setUpTestBed();
    });

    it('Should says that push is available', async(inject([Notifications], (ns: Notifications) => {
      expect(ns.isPushAvailable()).toBe(true, 'Respond that push is not available');
    })));

    it('Should be able to register for push', fakeAsync(inject([Notifications, HttpTestingController], (ns: Notifications, backend: HttpTestingController) => {
      let subscribed = false;
      ns.subscribeToPush().subscribe((response) => subscribed = response);

      tick();
      backend.expectOne('https://api.angular-universal-pwa.maciejtreder.com/webpush/vapid/subscribe').flush('accepted', {status: 202, statusText: 'OK'});
      expect(subscribed).toBe(true, 'Did not subscribe VAPID client!');
      backend.verify();
    })));

    it('Should be able to unregister from push', fakeAsync(inject([Notifications, HttpTestingController], (ns: Notifications, backend: HttpTestingController) => {
      swPushStub.subscription.next(pushSubscription2);
      let result = false;
      ns.unsubscribeFromPush().subscribe((response) => result = response);

      tick();
      backend.expectOne('https://api.angular-universal-pwa.maciejtreder.com/webpush/vapid/unsubscribe').flush('accepted', {status: 202, statusText: 'OK'});
      expect(result).toBe(true, 'Did not unsubscribe VAPID client!');
      backend.verify();
    })));

    it('Should respond as registered when there is subscription', fakeAsync(inject([Notifications, HttpTestingController], (ns: Notifications, backend: HttpTestingController) => {
      swPushStub.subscription.next(pushSubscription2);
      let registered: boolean;
      ns.isSubscribed().subscribe((result) => registered = result);

      expect(registered).toBe(true, 'Responded as not registered, when customer is subscribed to push');
    })));

    it('Should respond as not registered when there is no subscription', fakeAsync(inject([Notifications, HttpTestingController], (ns: Notifications, backend: HttpTestingController) => {
      let registered: boolean;
      ns.isSubscribed().subscribe((result) => registered = result);

      expect(registered).toBe(false, 'Responded as registered, when customer isn\'t subscribed.');
    })));
  });

  describe('Safari -', () => {
    let permission = {deviceToken: 'device_token', permission: 'granted'};

    beforeEach(() => {
      windowStub._window = {
        safari: {
          pushNotification: {
            requestPermission: (param1, param2, param3, callback) => callback(permission),
            permission: (param: string) => {
              return permission;
            }
          }
        }
      };
      setUpTestBed();
    });

    it('Should be able to check if push is available', async(inject([Notifications], (ns: Notifications) => {
      expect(ns.isPushAvailable()).toBeTruthy();
    })));

    it('Should be able to check if push is NOT available', async(inject([Notifications], (ns: Notifications) => {
      windowStub._window = {
        safari: {}
      };
      expect(ns.isPushAvailable()).toBeFalsy();
    })));

    it( 'Should be able to subscribe', async(inject([Notifications], (ns: Notifications) => {
      permission = {deviceToken: 'device_token', permission: 'default'};
      windowStub._window.safari.pushNotification.requestPermission = (var1, var2, var3, var4) => {
        var4({deviceToken: 'device_token', permission: 'granted'});
      };

      ns.subscribeToPush().subscribe((result) => {
        expect(result).toBe(true, 'Should respond with \'true\'.');
      });
    })));

    it( 'Should respond as not subscribed when permission is denied', async(inject([Notifications], (ns: Notifications) => {
      permission = {deviceToken: 'device_token', permission: 'default'};
      windowStub._window.safari.pushNotification.requestPermission = (var1, var2, var3, var4) => {
        var4({deviceToken: 'device_token', permission: 'denied'});
      };

      ns.subscribeToPush().subscribe((result) => {
        expect(result).toBe(false, 'Should respond with \'false\'.');
      });
    })));

    it('Should respond as registered when there is subscription', async(inject([Notifications, HttpTestingController], (ns: Notifications, backend: HttpTestingController) => {
      permission = {deviceToken: 'device_token', permission: 'granted'};
      ns.isSubscribed().subscribe((result) => {
        expect(result).toBe(true, 'Responded as not registered, when customer is subscribed to push');
      });
    })));

    it('Should respond as not registered when there is no subscription', async(inject([Notifications, HttpTestingController], (ns: Notifications, backend: HttpTestingController) => {
      permission = {deviceToken: 'device_token', permission: 'denied'};
      ns.isSubscribed().subscribe((result) => {
        expect(result).toBe(false, 'Responded as registered, when customer isn\'t subscribed.');
      });
    })));
  });
});
