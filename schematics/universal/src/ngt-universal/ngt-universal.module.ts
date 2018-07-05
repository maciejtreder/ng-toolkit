import { NgModule, InjectionToken } from '@angular/core';
import { WindowService } from './window.service';
import { LocalStorageWrapper } from './local-storage-wrapper.service';

export const WINDOW = new InjectionToken('ng-toolkit-window');

export function windowFactory(windowService: WindowService) {
    return windowService.nativeWindow;
}

export const LOCAL_STORAGE = new InjectionToken('ng-toolkit-local-storage');

export function localStoragefactory(localStorageWrapper: LocalStorageWrapper) {
    return localStorageWrapper.localStorage;
}

@NgModule({
    providers: [
        WindowService,
        { provide: WINDOW, useFactory: windowFactory, deps: [WindowService] },
        LocalStorageWrapper,
        { provide: LOCAL_STORAGE, useFactory: localStoragefactory, deps: [LocalStorageWrapper] },
    ]
})
export class NgtUniversalModule {}
