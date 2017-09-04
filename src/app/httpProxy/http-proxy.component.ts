import { Component } from '@angular/core';
import { Http, RequestOptionsArgs, RequestOptions, Headers } from '@angular/http';
import { Observable } from 'rxjs';

@Component({
    moduleId: module.id,
    selector: 'http-proxy',
    templateUrl: `./http-proxy.component.html`,
    styleUrls: ['../common.component.scss', './http-proxy.component.css'],
})
export class HttpProxyComponent {

    public valueToSend: string;
    public response: Observable<any>;

    constructor(private http: Http) {}

    public sendPost(): void {
        this.response = this.http.post('testPost', {exampleKey: this.valueToSend}).map((res) => res.json());
    }
}
