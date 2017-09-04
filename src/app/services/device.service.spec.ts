import { async, inject, TestBed } from '@angular/core/testing';
import { DeviceService } from './device.service';
import { WindowRef } from '../windowRef';
import * as sinon from 'sinon';

describe('device service - ', () => {
    let windowStub;
    beforeEach(() => {
        windowStub = sinon.createStubInstance(WindowRef);
        TestBed.configureTestingModule({
            providers: [
                DeviceService,
                {provide: 'Window', useValue: windowStub }
            ]
        });
    });

    it('should construct', async(inject([DeviceService], (deviceService) => {
        expect(deviceService).toBeDefined();
    })));
});

const mobileDevices: Map<string, string> = new Map([
    ['Samsung Galaxy S6', 'Mozilla/5.0 (Linux; Android 6.0.1; SM-G920V Build/MMB29K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36'],
    ['Samsung Galaxy S6 Edge Plus', 'Mozilla/5.0 (Linux; Android 5.1.1; SM-G928X Build/LMY47X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.83 Mobile Safari/537.36'],
    ['Microsoft Lumia 950', 'Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/13.10586'],
    ['Nexus 6P', 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 6P Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.83 Mobile Safari/537.36'],
    ['Sony Xperia Z5', 'Mozilla/5.0 (Linux; Android 6.0.1; E6653 Build/32.2.A.0.253) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36'],
    ['HTC One M9', 'Mozilla/5.0 (Linux; Android 6.0; HTC One M9 Build/MRA58K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36']
]);
mobileDevices.forEach((value, key) => {
    describe('device service - mobile devices - ', () => {
        let windowStub;
        beforeEach(() => {
            windowStub = sinon.createStubInstance(WindowRef);
            windowStub.nativeWindow.navigator.userAgent = value;
            TestBed.configureTestingModule({
                providers: [
                    DeviceService,
                    {provide: WindowRef, useValue: windowStub}
                ]
            });
        });

        it('Should be able to detect mobile devices', async(inject([DeviceService], (deviceService: DeviceService) => {
            expect(deviceService.isDesktop()).toBeFalsy();
            expect(deviceService.isTablet()).toBeFalsy();
            expect(deviceService.isMobile()).toBeTruthy();
        })));
    });
});

const desktops: Map<string, string> = new Map([
    ['Windows 10-based PC using Edge browser', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'],
    ['Chromebook', 'Mozilla/5.0 (X11; CrOS x86_64 8172.45.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.64 Safari/537.36'],
    ['Mac OS + Safari', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/601.3.9 (KHTML, like Gecko) Version/9.0.2 Safari/601.3.9'],
    ['Windows 7 + Chrome', 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36'],
    ['Linux + firefox', 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:15.0) Gecko/20100101 Firefox/15.0.1']
]);
desktops.forEach((value, key) => {
    describe('device service - desktop devices - ', () => {
        let windowStub;
        beforeEach(() => {
            windowStub = sinon.createStubInstance(WindowRef);
            windowStub.nativeWindow.navigator.userAgent = value;
            TestBed.configureTestingModule({
                providers: [
                    DeviceService,
                    {provide: WindowRef, useValue: windowStub}
                ]
            });
        });

        it('Should be able to detect desktops', async(inject([DeviceService], (deviceService: DeviceService) => {
            expect(deviceService.isMobile()).toBeFalsy();
            expect(deviceService.isTablet()).toBeFalsy();
            expect(deviceService.isDesktop()).toBeTruthy();
        })));
    });
});
