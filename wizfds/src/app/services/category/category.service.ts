import { Result, HttpManagerService } from '../http-manager/http-manager.service';
import { MainService } from '../main/main.service';
import { Main } from '../main/main';
import { Injectable } from '@angular/core';
import { Category, CategoryInterface } from './category';
import { IdGeneratorService } from '../id-generator/id-generator.service';
import { forEach } from 'lodash';
import { SnackBarService } from '@services/snack-bar/snack-bar.service';

@Injectable()
export class CategoryService {

  main: Main;

  constructor(
    private mainService: MainService,
    private httpManager: HttpManagerService,
    private idGeneratorService: IdGeneratorService,
    private snackBarService: SnackBarService
  ) {
    // Sync with main object
    this.mainService.getMain().subscribe(main => this.main = main);
  }

  /** Get categories from DB */
  public getCategories() {
    let promise = new Promise((resolve, reject) => {
      this.httpManager.get(this.main.settings.hostAddress + '/api/categories').then((result: Result) => {
        // Iterate through all projects
        forEach(result.data, (category: CategoryInterface) => {
          (category.visible == 't') ? category.visible = true : category.visible = false;
          (category.active == 't') ? category.active = true : category.active = false;

          this.main.categories.push(new Category(JSON.stringify(category)));
        });
        this.snackBarService.notify(result.meta.status, result.meta.details[0]);
        result.meta.status == 'info' ? resolve() : reject();
      });
    });
    return promise;
  }

  /** Create new category in DB */
  public createCategory() {
    let category = new Category(JSON.stringify({ uuid: this.idGeneratorService.genUUID, label: "New category", active: true, visible: true }));
    this.httpManager.post(this.main.settings.hostAddress + '/api/category', category.toJSON()).then((result: Result) => {
      this.main.categories.push(category);
      this.snackBarService.notify(result.meta.status, result.meta.details[0]);
    });
  }

  /** Update category in DB */
  public updataCategory(uuid: string, category: Category) {
    this.httpManager.put(this.main.settings.hostAddress + '/api/category/' + uuid, category.toJSON()).then((result: Result) => {

      this.snackBarService.notify(result.meta.status, result.meta.details[0]);
    });
  }

  /** Delete category */
  public deleteCategory(uuid: string) {
    this.httpManager.delete(this.main.settings.hostAddress + '/api/category/' + uuid).then((result: Result) => {

      this.snackBarService.notify(result.meta.status, result.meta.details[0]);
    });
  }

}