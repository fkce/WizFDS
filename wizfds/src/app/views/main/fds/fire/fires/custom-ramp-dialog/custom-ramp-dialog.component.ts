import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'custom-ramp-dialog',
  templateUrl: './custom-ramp-dialog.component.html',
  styleUrls: ['./custom-ramp-dialog.component.scss']
})
export class CustomRampDialogComponent implements OnInit {

  alpha: number = 0.0468;
  alpha2: number = 0.0011;
  sprinklerActivationTime: number;
  maxHrr: number;
  step: number;

  constructor(
    private dialogRef: MatDialogRef<CustomRampDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data
  ) { 
    this.alpha = data.alpha;
    this.alpha2 = data.alpha2;
    this.sprinklerActivationTime = data.sprinklerActivationTime;
    this.maxHrr = data.maxHrr;
    this.step = data.step;
  }

  ngOnInit() {
  }

  submit() {
    let data = {
      alpha: this.alpha,
      alpha2: this.alpha2,
      sprinklerActivationTime: this.sprinklerActivationTime,
      maxHrr: this.maxHrr,
      step: this.step
    }
    this.dialogRef.close(data);
  }

}
