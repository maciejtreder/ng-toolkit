import { NgModule } from '@angular/core';
import { WindowService, WINDOW } from './window.service';

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
