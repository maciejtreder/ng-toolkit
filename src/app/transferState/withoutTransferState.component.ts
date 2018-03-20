import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    templateUrl: './transferState.component.html',
    styleUrls: ['./transferState.component.css']
})
export class WithoutTransferStateComponent implements OnInit {
    public responsePing: string;
    public responseCount: number;

    constructor(private route: ActivatedRoute) {}

    public ngOnInit() {
        this.responsePing = this.route.snapshot.data.ping;
        this.responseCount = this.route.snapshot.data.count;
    }
}
