import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material';
import Queue from 'typescript-collections/dist/lib/Queue';

@Injectable()
export class SnackBar {

  private snackBarNotificationsQueue: Queue<SnackBarNotification> = new Queue<SnackBarNotification>();
  private snackBarNotificationsForceQueue: Queue<SnackBarNotification> = new Queue<SnackBarNotification>();
  private actuallyDisplayedNotification: SnackBarNotification = null;
  private snackbarOpened: boolean = false;

  constructor(private snackBar: MatSnackBar) {
  }

  public displayNotification(notification: SnackBarNotification): void {
    if (notification.force) {
      this.snackBarNotificationsForceQueue.enqueue(notification);
    } else {
      this.snackBarNotificationsQueue.enqueue(notification);
    }
    this.runCarousel();
  }

  private loadNotificationToDisplay(): void {
    if (this.snackBarNotificationsForceQueue.size() > 0) {
      this.actuallyDisplayedNotification = this.snackBarNotificationsForceQueue.dequeue();
    } else if (this.snackBarNotificationsQueue.size() > 0) {
      this.actuallyDisplayedNotification = this.snackBarNotificationsQueue.dequeue();
    } else {
      this.actuallyDisplayedNotification = null;
      return;
    }
  }

  private runCarousel(): void {
    if (this.snackbarOpened) {
      if (!this.actuallyDisplayedNotification.force && this.snackBarNotificationsForceQueue.size() > 0) {
        this.snackBar.dismiss();
      }
      return;
    }
    this.loadNotificationToDisplay();
    if (this.actuallyDisplayedNotification == null) {
      return;
    }

    this.snackbarOpened = true;

    const config: MatSnackBarConfig = new MatSnackBarConfig();
    config.duration = 1000 * this.actuallyDisplayedNotification.duration;
    const callback = this.actuallyDisplayedNotification.callback;

    this.snackBar.open(this.actuallyDisplayedNotification.message, this.actuallyDisplayedNotification.action, config).afterDismissed().subscribe(() => {
      if (callback) {
        callback();
      }
      this.snackbarOpened = false;
      this.runCarousel();
    });
  }
}

export interface SnackBarNotification {
  message: string;
  action: string;
  duration: number;
  callback: () => void;
  force: boolean;
}
