import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgKatexShimComponent } from './katex.component';

@NgModule({
  imports: [CommonModule],
  declarations: [NgKatexShimComponent],
  exports: [NgKatexShimComponent]
})
export class NgKatexShimModule {}
