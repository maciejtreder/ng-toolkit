import { Component } from '@angular/core';
import { Response, Headers, RequestOptions } from '@angular/http';

import { HttpSwProxy } from 'ng-http-sw-proxy';
import { Observable } from 'rxjs';


export interface RespToDisplay {
    body: any,
    response: any
}

@Component({
    moduleId: module.id,
    selector: 'http-proxy-demo',
    templateUrl: `./http-proxy-demo.html`,
    styleUrls: ['../common.component.scss', './http-proxy-demo.css'],
})
export class HttpProxyDemoComponent {

    public valueToSend: string;
    public response: Observable<any>;

    constructor(private http: HttpSwProxy) {}

    public sendPost():void {
        this.response = this.http.post("testPost", {exampleKey: this.valueToSend}).map(res => res.json());
    }
}

