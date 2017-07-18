/**
 * Created by ahsanayaz on 08/11/2016.
 */

export class ReTree {

    constructor() {

    }

    public test(string: string , regex: any): any {
        let self = this;
        if (typeof regex === 'string') {
            regex = new RegExp(regex);
        }

        if (regex instanceof RegExp) {
            return regex.test(string);
        }else if (regex && Array.isArray(regex.and)) {
            return regex.and.every(function (item: any) {
                return self.test(string, item);
            });
        }else if (regex && Array.isArray(regex.or)) {
            return regex.or.some(function (item: any) {
                return self.test(string, item);
            });
        }else if (regex && regex.not) {
            return !self.test(string, regex.not);
        }else {
            return false;
        }
    }

    public exec(string: string, regex: any): any {
        let self = this;
        if (typeof regex === 'string') {
            regex = new RegExp(regex);
        }

        if (regex instanceof RegExp) {
            return regex.exec(string);
        }else if (regex && Array.isArray(regex)) {
            return regex.reduce(function (res: any, item: any) {
                return (!!res) ? res : self.exec(string, item);
            }, null);
        }else {
            return null;
        }
    }
}