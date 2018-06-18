import { Injectable, Inject, PLATFORM_ID, InjectionToken } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable()
export class WindowService {
    private _window: Window;
    constructor(@Inject(PLATFORM_ID) platformId: any) {
        if (!isPlatformBrowser(platformId)) {
            // const req: any = this.injector.get(this.injector.get(USERAGENTTOKEN));
            // this._window = {navigator: {userAgent: req.get('User-Agent')}};
            this._window = {navigator: {userAgent: 'fakeAgent'}} as Window;
        } else {
            this._window = window;
        }
    }

    get nativeWindow(): any {
        return this._window;
    }
}
