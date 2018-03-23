import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    templateUrl: './transferState.component.html',
    styleUrls: ['./transferState.component.css']
})
export class WithoutTransferStateComponent implements OnInit {
    public hits: string;
    public shake: boolean = false;

    constructor(private route: ActivatedRoute) {}

    public ngOnInit() {
        this.hits = this.route.snapshot.data.hits;
    }

    public performRequest(): void {
        window.location.reload();
    }
}
