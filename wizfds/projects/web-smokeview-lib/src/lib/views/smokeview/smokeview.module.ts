import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SmokeviewComponent } from './smokeview.component';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
//import { SliderDirective } from '../../directives/slider/slider.directive';

@NgModule({
  declarations: [SmokeviewComponent],
  imports: [
    CommonModule,
    //SliderDirective,
    FormsModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSliderModule,
    MatCheckboxModule
    //SmokeviewComponent
  ],
  exports: [
    SmokeviewComponent
  ]
})
export class SmokeviewModule { }
