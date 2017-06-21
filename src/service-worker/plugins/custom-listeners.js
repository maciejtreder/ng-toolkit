import * as idb from 'idb';
import * as _ from 'underscore';

export function CustomListeners () {
    return (worker) => new CustomListenersImpl(worker)
}

export class CustomListenersImpl {


    setup (ops) {}

    constructor () {

        var store = {
            db: null,
            transaction: null,

            init: function() {
                if (store.db) { return Promise.resolve(store.db); }
                return idb.open('restRequest', 1, function(upgradeDb) {
                    upgradeDb.createObjectStore('requests', { autoIncrement : true, keyPath: 'id' });
                    upgradeDb.createObjectStore('responses', {keyPath: 'id', autoIncrement: false});
                }).then(function(db) {
                    return store.db = db;
                });
            },

            requests: function(mode) {
                return store.init().then(function(db) {
                    store.transaction = db.transaction('requests', mode);
                    return store.transaction.objectStore('requests');
                    //return db.transaction('requests', mode).objectStore('requests');
                })
            },

            responses: function(mode) {
                return this.init().then(db => {
                    store.transaction = db.transaction('responses', mode);
                    return store.transaction.objectStore('responses');
                })
            },
            closeTransaction: function() {
                return store.transaction.complete;
            }
        }

        self.addEventListener('sync', event => {

            event.waitUntil(
                store.requests('readonly').then(requests => {
                    return requests.getAll()
                }).then(requests =>{
                    return Promise.all(requests.map(request => {

                        let payload = {
                            method: request.method,
                            body: request.body
                        }
                        if (request.options)
                            payload['headers'] = request.options.headers;

                        return fetch(request.url, payload).then(response => {
                            console.log("got response for request  " + request.id);
                            store.requests('readwrite').then(requests => requests.delete(request.id));
                            var respToStore = {
                                type: response.type,
                                bodyUsed: response.bodyUsed,
                                headers: [],
                                ok: response.ok,
                                redirect: response.redirect,
                                status: response.status,
                                statusText: response.statusText,
                                url: response.url,
                                body: response.body
                            }

                            for ( var headerPair of response.headers.entries()) {
                                respToStore.headers[headerPair[0]] = headerPair[1]
                            }
                            store.responses('readwrite').then(responses => responses.put({id: request.id, response: respToStore}));
                            return store.closeTransaction();
                        })
                    }))
                }).catch(err => console.error(err))

            );
        })
    }

}