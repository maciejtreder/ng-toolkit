import * as Constants from './device.constants';
import { ReTree } from './retree.service';
import { WindowRef } from '../windowRef';
import { Injectable } from '@angular/core';

@Injectable()
export class DeviceService {
    private ua = '';
    private userAgent = '';
    private os = '';
    private browser = '';
    private device = '';
    private osVersion = '';
    private browserVersion = '';

    constructor(window: WindowRef) {
        this.ua = window.nativeWindow.navigator.userAgent;
        this._setDeviceInfo();
    }

    public getDeviceInfo(): any {
        return {
            userAgent: this.userAgent,
            os : this.os,
            browser: this.browser,
            device : this.device,
            os_version: this.osVersion,
            browser_version: this.browserVersion,
        };
    }

    public isMobile(): boolean {
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
    }

    public isTablet(): boolean {
        return [
            Constants.DEVICES.I_PAD,
            Constants.DEVICES.FIREFOX_OS
        ].some((item) => {
                return this.device === item;
            });
    }

    public isDesktop(): boolean {
        return [
            Constants.DEVICES.PS4,
            Constants.DEVICES.CHROME_BOOK,
            Constants.DEVICES.UNKNOWN
        ].some((item) => {
                return this.device === item;
            });
    }

    private _setDeviceInfo() {
        const reTree = new ReTree();
        const ua = this.ua;
        this.userAgent = ua;
        const mappings = [
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

        this.browserVersion = '0';
        if (this.browser !== Constants.BROWSERS.UNKNOWN) {
            const re = Constants.BROWSER_VERSIONS_RE[this.browser];
            const res = reTree.exec(ua, re);
            if (!!res) {
                this.browserVersion = res[1];
            }
        }
    }
}
