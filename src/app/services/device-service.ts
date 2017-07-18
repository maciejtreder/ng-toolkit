import { REQUEST } from '@nguniversal/express-engine/tokens';

import { PLATFORM_ID, Inject, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as Constants from './device.constants';
import { ReTree } from './retree.service';

export class DeviceService {
    ua = '';
    userAgent = '';
    os = '';
    browser = '';
    device = '';
    os_version = '';
    browser_version = '';
    constructor(@Inject(PLATFORM_ID) platformId, private injector: Injector) {
        if (isPlatformBrowser(platformId)) {
            this.ua = window.navigator.userAgent;
        }
        else {
            let req: any = this.injector.get(REQUEST);
            this.ua = req.get('User-Agent');
        }
        this._setDeviceInfo();
    }

    private _setDeviceInfo() {
        let reTree = new ReTree();
        let ua = this.ua;
        this.userAgent = ua;
        let mappings = [
            { const : 'OS' , prop: 'os'},
            { const : 'BROWSERS' , prop: 'browser'},
            { const : 'DEVICES' , prop: 'device'},
            { const : 'OS_VERSIONS' , prop: 'os_version'},
        ];

        mappings.forEach((mapping) => {
            this[mapping.prop] = Object.keys(Constants[mapping.const]).reduce((obj: any, item: any) => {
                obj[Constants[mapping.const][item]] = reTree.test(ua, Constants[`${mapping.const}_RE`][item]);
                return obj;
            }, {});
        });

        mappings.forEach((mapping) => {
            this[mapping.prop] = Object.keys(Constants[mapping.const])
                .map((key) => {
                    return Constants[mapping.const][key];
                }).reduce((previousValue, currentValue) => {
                    return (previousValue === Constants[mapping.const].UNKNOWN && this[mapping.prop][currentValue])
                        ? currentValue : previousValue;
                }, Constants[mapping.const].UNKNOWN);
        });

        this.browser_version = '0';
        if (this.browser !== Constants.BROWSERS.UNKNOWN) {
            let re = Constants.BROWSER_VERSIONS_RE[this.browser];
            let res = reTree.exec(ua, re);
            if (!!res) {
                this.browser_version = res[1];
            }
        }
    }

    public getDeviceInfo(): any {
        return {
            userAgent: this.userAgent,
            os : this.os,
            browser: this.browser,
            device : this.device,
            os_version: this.os_version,
            browser_version: this.browser_version,
        };
    }
    public isMobile() {
        return [
            Constants.DEVICES.ANDROID,
            Constants.DEVICES.IPHONE,
            Constants.DEVICES.I_POD,
            Constants.DEVICES.BLACKBERRY,
            Constants.DEVICES.FIREFOX_OS,
            Constants.DEVICES.WINDOWS_PHONE,
            Constants.DEVICES.VITA
        ].some((item) => {
                return this.device === item;
            });
    };

    public isTablet() {
        return [
            Constants.DEVICES.I_PAD,
            Constants.DEVICES.FIREFOX_OS
        ].some((item) => {
                return this.device === item;
            });
    };

    public isDesktop() {
        return [
            Constants.DEVICES.PS4,
            Constants.DEVICES.CHROME_BOOK,
            Constants.DEVICES.UNKNOWN
        ].some((item) => {
                return this.device === item;
            });
    };
}