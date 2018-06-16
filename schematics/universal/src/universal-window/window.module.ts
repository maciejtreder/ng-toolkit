import { NgModule, InjectionToken } from '@angular/core';
import { WindowService } from './window.service';

export const WINDOW = new InjectionToken('ng-toolkit-window');

export function factoryFn(windowService: WindowService) {
    return windowService.nativeWindow;
}

@NgModule({
    providers: [
        WindowService,
        { provide: WINDOW, useFactory: factoryFn, deps: [WindowService] }
    ]
})
export class WindowModule {}
