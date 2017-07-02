import { Component } from '@angular/core';
import { HttpSwProxy } from 'ng-http-sw-proxy';
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

    public showHideText: string = "Show flow";
    public showFlow: boolean = false;

    constructor(private http: HttpSwProxy) {}

    public sendPost():void {
        this.response = this.http.post("testPost", {exampleKey: this.valueToSend}).map(res => res.json());
    }

    public showHideFlow(): void {
        this.showFlow = this.showFlow?false:true;
        this.showHideText = this.showFlow?'Hide flow':'Show flow';
    }
}

