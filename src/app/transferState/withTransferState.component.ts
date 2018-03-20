import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    templateUrl: './transferState.component.html',
    styleUrls: ['./transferState.component.css']
})
export class WithTransferStateComponent implements OnInit {
    public hits: string;

    constructor(private route: ActivatedRoute) {}

    public ngOnInit() {
        this.hits = this.route.snapshot.data.hits;
    }
}
