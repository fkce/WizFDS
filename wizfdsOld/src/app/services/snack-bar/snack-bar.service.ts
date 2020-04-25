import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

interface ISnack {
  message: string,
  type: string,
  id: number
}

@Injectable({
  providedIn: 'root'
})
export class SnackBarService {

  private processingMessage = false;
  private messageId = 0;
  private messageQueue: ISnack[] = [];

  constructor(
    private snackBar: MatSnackBar
  ) { }

  private displaySnackbar(): void {
    const nextMessage = this.getNextMessage();

    if (!nextMessage) {
      this.processingMessage = false;
      return;
    }

    this.processingMessage = true;

    this.snackBar.open(nextMessage.message, undefined, { panelClass: nextMessage.type })
      .afterDismissed()
      .subscribe(() => {
        this.displaySnackbar();
      });
  }

  private getNextMessage(): ISnack | undefined {
    return this.messageQueue.length ? this.messageQueue.shift() : undefined;
  }

  public notify(type: string = 'success', message: string = ''): void {
    this.messageQueue.push({ message: message, type: type, id: ++this.messageId });
    if (!this.processingMessage) {
      this.displaySnackbar();
    }
  }

}
