import { Directive, HostListener, ElementRef, AfterViewInit } from '@angular/core';
import { PlayerService } from '../../services/player/player.service';
import { SliceService } from '../../services/drawing/slice/slice.service';
import { toInteger } from 'lodash';

@Directive({
  selector: '[slider]'
})
export class SliderDirective implements AfterViewInit {

  @HostListener('click', ['$event'])
  onClick(event) {
    this.playerService.sliderWidth = this.el.nativeElement.scrollWidth;
    this.playerService.frameCur = toInteger(event.offsetX / this.playerService.sliderWidth * this.playerService.frameNo);
    this.sliceService.setTex();
  }
  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.playerService.sliderWidth = this.el.nativeElement.scrollWidth;
  }

  constructor(
    private el: ElementRef,
    private playerService: PlayerService,
    private sliceService: SliceService
  ) { }

  ngAfterViewInit() {
    this.playerService.sliderWidth = this.el.nativeElement.scrollWidth;
  }
}
