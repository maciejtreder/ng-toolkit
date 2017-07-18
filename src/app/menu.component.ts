import { Component, Output, EventEmitter } from '@angular/core';
import { ServiceWorkerService } from './services/service-worker.service';

@Component({
    moduleId: module.id,
    selector: 'menu',
    template: `
        <a md-raised-button routerLink="/"> <i class="material-icons">home</i> Home</a>
        <a md-raised-button routerLink="/lazy"><i class="material-icons">free_breakfast</i> Lazy</a>
        <a md-raised-button routerLink="/httpProxy"><i class="material-icons">merge_type</i> Http proxy demo</a>
        <a md-raised-button (click)="subscribeToPush()"><i class="material-icons">message</i> Subscribe to push</a>
        <a md-raised-button target="_blank" href="https://github.com/maciejtreder/angular-universal-serverless"><i class="material-icons">code</i> Fork on github</a>
    `,
    styleUrls: ['./menu.component.scss']
})
export class MenuComponent {
    constructor(private sws: ServiceWorkerService) {}

    public subscribeToPush():void {
        this.sws.registerForPush();
    }
}