import { Injectable, Inject, PLATFORM_ID, Injector, InjectionToken } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { REQUEST } from '@nguniversal/express-engine/tokens';

@Injectable()
export class WindowRef {
  private _window;
  constructor(@Inject(PLATFORM_ID) platformId, private injector: Injector) {
    if (!isPlatformBrowser(platformId)) {
      const req = this.injector.get(REQUEST);
      this._window = {navigator: {userAgent: req.get('User-Agent')}};
    } else {
      this._window = window;
    }
  }

  get nativeWindow(): any {
    return this._window;
  }
}
