import { Component } from '@angular/core';

@Component({
    moduleId: module.id,
    selector: 'lazy-view',
    template: `<div class="content"><h3>I am lazy!</h3></div>`
})
export class LazyComponent {}
