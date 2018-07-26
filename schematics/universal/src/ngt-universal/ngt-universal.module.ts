import { NgModule, InjectionToken } from '@angular/core';
import { WindowService } from './window.service';
import { LocalStorageWrapper } from './local-storage-wrapper.service';
import { DocumentService } from './document.service';

export * from './document.service';

export const WINDOW = new InjectionToken('ng-toolkit-window');

export function windowFactory(windowService: WindowService) {
    return windowService.nativeWindow;
}

export const LOCAL_STORAGE = new InjectionToken('ng-toolkit-local-storage');

export function localStorageFactory(localStorageWrapper: LocalStorageWrapper) {
    return localStorageWrapper.localStorage;
}

export const NGT_DOCUMENT = new InjectionToken('ng-toolkit-document');

export function documentFactory(documentService: DocumentService) {
    console.log('document factory');
    return documentService.nativeDocument;
}

@NgModule({
    providers: [
        WindowService,
        { provide: WINDOW, useFactory: windowFactory, deps: [WindowService] },
        DocumentService,
        { provide: NGT_DOCUMENT, useFactory: documentFactory, deps: [DocumentService] },
        LocalStorageWrapper,
        { provide: LOCAL_STORAGE, useFactory: localStorageFactory, deps: [LocalStorageWrapper] }
    ]
})
export class NgtUniversalModule {}
