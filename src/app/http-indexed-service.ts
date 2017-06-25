import { Http, Response, RequestOptionsArgs } from '@angular/http';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common'
import { Observable, Observer } from 'rxjs';
import * as idb from 'idb';
import { UpgradeDB, DB, Transaction, ObjectStore } from 'idb';

@Injectable()
export class HttpIndexedService {

    private platformId: Object;
    private store: Store = new Store();

    private isConnected: boolean = false;

    constructor(@Inject(PLATFORM_ID)  platformId: Object, private http: Http) {
        //http.delete()
        //http.get()
        //http.head()
        //http.options()
        //http.patch()
        //http.post()
        //http.put()
        //http.request()
        this.platformId = platformId; //Intellij type checking workaround.
        this.hasNetworkConnection().subscribe(connected => this.isConnected = connected);
    }

    public get(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return this.resolveRequest({
            method: methods.GET,
            url: url,
            options: options
        });
    }

    public post(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
        return this.resolveRequest({method: methods.POST, url, body, options});
    }

    public hasNetworkConnection(): Observable<boolean> {
        if(!isPlatformBrowser(this.platformId))
            return Observable.of(true);
        return Observable.merge(
            Observable.of(navigator.onLine),
            Observable.fromEvent(window, 'online').map(() => true),
            Observable.fromEvent(window, 'offline').map(() => false)
        );
    }

    private resolveRequest(request: RestRequest): Observable<Response> {
        if (this.isConnected)
            return this.makeRequest(request);
        else
            return this.passThroughDB(request);
    }

    private makeRequest(request: RestRequest): Observable<Response> {
        let obs: Observable<Response>;
        switch(request.method) {
            case methods.GET: {
                obs = this.http.get(request.url, request.options);
                break;
            }
            case methods.POST: {
                obs = this.http.post(request.url, request.body, request.options);
                break;
            }
        }
        return obs;
    }

    private getResponseFromDB(messageId: any): Observable<Response> {
        return Observable.create((observer: Observer<Response>) => {
            let checkInterval;
            checkInterval = setInterval(() => {
                this.store.responses('readwrite').then(transaction => transaction.get(messageId).then(entry => {
                    if (entry) {
                        clearInterval(checkInterval);
                        transaction.delete(messageId);
                        if(entry['response'].ok)
                            observer.next(<Response> entry['response']);
                        else
                            observer.error(<Response> entry['response']);
                        observer.complete;
                    }
                }))
            }, 100)
        });
    }

    private waitForConnectionAndSend(): void {
        this.store.requests('readonly').then(transaction => {
            transaction.getAll().then(requests => {
                requests.forEach((request : RestRequest) => {
                    this.hasNetworkConnection().filter(connection => connection).subscribe(() => {
                        this.makeRequest(request).subscribe((resp: Response) => {
                            this.store.requests('readwrite').then(transaction => transaction.delete(request['id']));
                            this.store.responses('readwrite').then(responses => responses.put({ response: resp, id: request['id']}));
                        }, error => {
                            this.store.requests('readwrite').then(transaction => transaction.delete(request['id']));
                            this.store.responses('readwrite').then(responses => responses.put({ response: error, id: request['id']}));
                        });
                    });
                });
            });
        });
    }

    private passThroughDB(request: RestRequest): Observable<Response> {
        return Observable.create(subject => {
            this.store.requests("readwrite").then(transaction => transaction.put(request)).then((key) => {
                if(process.env.NODE_ENV == 'production' && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then((swRegistration: ServiceWorkerRegistration) => {
                        swRegistration.sync.register('request');
                    });
                }
                else {
                    this.waitForConnectionAndSend();
                }
                this.getResponseFromDB(key).subscribe(resp => subject.next(resp));
            });
        });
    }
}



class Store {
    private db: any = null

    public init():Promise<any> {
        if (this.db) { return Promise.resolve(this.db); }
        return idb.default.open('restRequest', 1, upgradeDb => {
            upgradeDb.createObjectStore('requests', { autoIncrement : true, keyPath: 'id' });
            upgradeDb.createObjectStore('responses', {keyPath: 'id', autoIncrement: false});
        }).then(database => {
            return this.db = database;
        });
    }

    public requests(mode: string): Promise<ObjectStore> {
        return this.init().then(db => {
            return this.db.transaction('requests', mode).objectStore('requests');
        })
    }

    public responses(mode: string): Promise<ObjectStore> {
        return this.init().then(db => {
            return this.db.transaction('responses', mode).objectStore('responses');
        })
    }
}

interface RestRequest {
    method: string;
    url: string;
    body?: any;
    options?: RequestOptionsArgs;
}
let methods = {
    DELETE: "DELETE",
    GET: "GET",
    HEAD: "HEAD",
    OPTIONS: "OPTIONS",
    PATCH: "PATCH",
    POST: "POST",
    PUT: "PUT",
    REQUEST: "REQUEST"
}