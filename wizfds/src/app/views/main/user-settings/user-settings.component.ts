import { Component, OnInit, OnDestroy } from '@angular/core';

import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.scss']
})
export class UserSettingsComponent implements OnInit, OnDestroy {

  main: Main;
  changePassword: boolean = false;
  oldPassword: string = '';
  newPassword: string = '';
  newPasswordRepeat: string = '';

  mainSub;

  constructor(
    private mainService: MainService
  ) { }

  ngOnInit() {
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
  }

  /**
   * Save settings
   */
  public saveSettings() {
    this.mainService.updateSettings();
  }

}
