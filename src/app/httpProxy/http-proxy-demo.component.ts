import { Component } from '@angular/core';
import { Http, RequestOptionsArgs, RequestOptions, Headers } from '@angular/http';
import { Observable } from 'rxjs';

@Component({
    moduleId: module.id,
    selector: 'http-proxy-demo',
    templateUrl: `./http-proxy-demo.html`,
    styleUrls: ['../common.component.scss', './http-proxy-demo.css'],
})
export class HttpProxyDemoComponent {

    public valueToSend: string;
    public response: Observable<any>;

    constructor(private http: Http) {}

    public sendPost(): void {
        this.response = this.http.post('testPost', {exampleKey: this.valueToSend}).map((res) => res.json());
    }
}
