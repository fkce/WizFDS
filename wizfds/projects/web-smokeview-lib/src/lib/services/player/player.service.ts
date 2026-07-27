import { Injectable } from '@angular/core';
import { SceneLifecycleService, SceneScoped } from '../babylon/scene-lifecycle.service';

@Injectable({
  providedIn: 'root'
})
export class PlayerService implements SceneScoped {

  isPlay: boolean = false;

  dt: number = 50;

  //frameSize: number = 0;
  frameNo: number = 0;
  frameCur: number = 0;

  sliderWidth: number = 0;
  sliderInterval: any;

  constructor(sceneLifecycle: SceneLifecycleService) {
    sceneLifecycle.register(this);
  }

  /**
   * Stop playback and rewind.
   *
   * The playback interval writes vertex data into slice meshes every 50 ms.
   * Leaving the view mid-playback without this keeps that interval alive,
   * writing into meshes belonging to a scene that has been disposed.
   */
  public resetSceneState(): void {
    this.stop();
    this.sliderInterval = undefined;
    this.frameNo = 0;
    this.frameCur = 0;
    this.sliderWidth = 0;
  }

  /**
   * Changing current frame
   * @param event slidebar click
   */
  public onSliderChange(event: any) {
    this.frameCur = event.value;
  }

  /**
   * Set slider bar 
   */
  public setSlider(): number {
    return this.sliderWidth / (this.frameNo - 1) * this.frameCur;
  }

  /**
   * Set interval
   */
  public stop() {
    if(this.sliderInterval) {
      clearInterval(this.sliderInterval);
    }
    this.isPlay = false;
  }

  /**
   * Start
   */
  public start() {
    this.isPlay = true;
  }


}
