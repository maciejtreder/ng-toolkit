import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable()
export class LocalStorageWrapper {
    private localStorageRef;

    constructor(@Inject(PLATFORM_ID) platformId) {
        if (isPlatformBrowser(platformId)) {
            this.localStorageRef = localStorage;
        } else {
            this.localStorageRef = {
            clear: () => {/*noop*/},
            getItem: (key: string) => undefined as string,
            key: (index: number) => undefined as string,
            removeItem: (key: string) => {/*noop*/},
            setItem: (key: string, value: string) => {/*noop*/},
            length: 0
            };
        }
    }

    get localStorage() {
        return this.localStorageRef;
    }
}
