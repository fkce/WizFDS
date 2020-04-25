import { UiStateService } from '../../../services/ui-state/ui-state.service';
import { UiState } from '../../../services/ui-state/ui-state';
import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-fds-menu',
  templateUrl: './fds-menu.component.html',
  styleUrls: ['./fds-menu.component.scss']
})
export class FdsMenuComponent implements OnInit, OnDestroy {

  uiState: UiState;

  uiSub;

  constructor(private uiStateService: UiStateService) { }

  ngOnInit() {
    this.uiSub = this.uiStateService.uiObservable.subscribe(uiObservable => this.uiState = uiObservable);
  }

  ngOnDestroy() {
    this.uiSub.unsubscribe();
  }

  // Toggle open or close menu main items
  toggleMenu(menuItem: string) {
    this.uiState.fdsMenu[menuItem] = !this.uiState.fdsMenu[menuItem];
  }

  activate(option: string) {
    this.uiState.active = option;
  }


}
