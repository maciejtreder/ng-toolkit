import { Component } from '@angular/core';

@Component({
    templateUrl: './donors.component.html',
    styles: [`
        div.wrapper {display: flex; flex-direction: row}
        .wrapper div {flex: 1;}
        .wrapper div { padding: 5px; }
    `]
})
export class DonorsComponent {}
