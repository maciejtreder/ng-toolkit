/**
 * Created by ahsanayaz on 08/11/2016.
 */

export class ReTree {

    public test(str: string , regex: any): any {
        if (typeof regex === 'string') {
            regex = new RegExp(regex);
        }

        if (regex instanceof RegExp) {
            return regex.test(str);
        } else if (regex && Array.isArray(regex.and)) {
            return regex.and.every((item: any) => this.test(str, item));
        } else if (regex && Array.isArray(regex.or)) {
            return regex.or.some((item: any) => this.test(str, item));
        } else if (regex && regex.not) {
            return !this.test(str, regex.not);
        } else {
            return false;
        }
    }

    public exec(str: string, regex: any): any {
        if (typeof regex === 'string') {
            regex = new RegExp(regex);
        }

        if (regex instanceof RegExp) {
            return regex.exec(str);
        } else if (regex && Array.isArray(regex)) {
            return regex.reduce((res: any, item: any) => {
                return (!!res) ? res : this.exec(str, item);
            }, null);
        }else {
            return null;
        }
    }
}
