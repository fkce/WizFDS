import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { toNumber, round } from 'lodash';
import { Ramp } from '@services/fds-object/ramp/ramp';

@Component({
  selector: 'app-steps-dialog',
  templateUrl: './steps-dialog.component.html',
  styleUrls: ['./steps-dialog.component.scss']
})
export class StepsDialogComponent implements OnInit {

  ramp: Ramp;
  value: number;
  isPure: boolean;
  units: number[];

  // Pass data from dialog to parent component
  params;

  constructor(
    private dialogRef: MatDialogRef<StepsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data
  ) {
    this.ramp = data.ramp;
    this.value = data.value;
    this.isPure = data.isPure;
    this.units = data.units;
  }

  ngOnInit(): void { }

  /** Set time value */
  public setT(tValue: number, stepIndex: number) {
    this.ramp.steps[stepIndex].t = toNumber(tValue);
  }

  /** Get ramp f value without calc */
  public getPureF(stepIndex: number) {
    return this.ramp.steps[stepIndex].f;
  }

  /** Set ramp f value without calc */
  public setPureF(fValue: number, stepIndex: number) {
    this.ramp.steps[stepIndex].f = fValue;
  }

  /** Get ramp f value */
  public getF(stepIndex: number) {
    return round(this.ramp.steps[stepIndex].f * this.value, 6);
  }

  /** Set ramp f value */
  public setF(fValue: number, stepIndex: number) {
    this.ramp.steps[stepIndex].f = fValue / this.value;
  }

  /** Update chart */
  public updateChart() {
    this.params.updateChart();
  }

  /** Close */
  submit() {
    this.dialogRef.close();
  }
}
