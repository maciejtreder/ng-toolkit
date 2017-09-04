import { Injectable } from '@angular/core';
import { MdSnackBar, MdSnackBarConfig } from '@angular/material';
import * as _ from 'underscore';

@Injectable()
export class SnackBarService {
    private isDisplayed: boolean = false;
    private defaultConfig: MdSnackBarConfig = new MdSnackBarConfig();

    constructor(private snackBar: MdSnackBar) {
        this.defaultConfig.extraClasses = ['service_worker_snack'];
    }

    public showMessage(
        message: string,
        action?: string,
        duration: number = -1,
        callback?: () => void,
        forceDisplay?: boolean
    ): void {
        if (this.isDisplayed && !forceDisplay) {
            return;
        }

        const config: MdSnackBarConfig = _.clone(this.defaultConfig);
        config.duration = duration;

        this.snackBar.dismiss();
        this.snackBar.open(message, action, config).afterDismissed().subscribe(() => {
            this.isDisplayed = false;
            if (callback) {
                callback();
            }
        });
    }
}
