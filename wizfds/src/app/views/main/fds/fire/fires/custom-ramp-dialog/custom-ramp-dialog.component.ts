import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { toNumber } from 'lodash';

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
      alpha: toNumber(this.alpha),
      alpha2: toNumber(this.alpha2),
      sprinklerActivationTime: toNumber(this.sprinklerActivationTime),
      maxHrr: toNumber(this.maxHrr),
      step: toNumber(this.step)
    }
    this.dialogRef.close(data);
  }

}
