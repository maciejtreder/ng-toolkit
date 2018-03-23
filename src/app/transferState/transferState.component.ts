import { Component, ElementRef, ViewChild } from '@angular/core';

@Component({
    templateUrl: './transferState.component.html',
    styleUrls: ['./transferState.component.css']
})
export class TransferStateComponent {

    public hits: string;
    public shake: boolean;

    public performRequest(): void {
        this.shake = true;
        setTimeout(() => this.shake = false, 2000);
    }
}
