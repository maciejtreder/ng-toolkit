import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable()
export class DocumentService {
    private _document: Document;
    constructor(@Inject(PLATFORM_ID) platformId: any) {
        if (!isPlatformBrowser(platformId)) {
            this._document = <unknown> {
                getElementById: (id: string) => new HTMLElement(),
                getElementsByClassName: (className: string) => new HTMLCollection(),
                getElementsByName: (name: string) => new NodeList(),
                getElementsByTagName: (name: string) => new NodeList()
            } as Document;
        } else {
            console.log('in browser, assigning document');
            // this._document = document;
            this._document = {} as Document;
        }
    }

    get nativeDocument(): Document {
        console.log('get native document');
        console.log(this._document);
        return this._document;
    }
}
