import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SmokeviewComponent } from './smokeview.component';
import { TimelineBarComponent } from '../timeline-bar/timeline-bar.component';
import { QuantityLegendComponent } from '../quantity-legend/quantity-legend.component';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
//import { SliderDirective } from '../../directives/slider/slider.directive';

@NgModule({
  declarations: [SmokeviewComponent, TimelineBarComponent, QuantityLegendComponent],
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
