import {Result, HttpManagerService} from '../http-manager/http-manager.service';
import {MainService} from '../main/main.service';
import {Main} from '../main/main';
import { Injectable } from '@angular/core';
import { Category, CategoryInterface } from './category';
import { IdGeneratorService } from '../id-generator/id-generator.service';
import { NotifierService } from 'angular-notifier';
import { forEach } from 'lodash';

@Injectable()
export class CategoryService {

  main:Main;

  constructor(
    private mainService:MainService, 
    private httpManager:HttpManagerService, 
    private idGeneratorService:IdGeneratorService, 
    private readonly notifierService: NotifierService
  ) { 
    // Sync with main object
    this.mainService.getMain().subscribe(main => this.main = main);
  }

  /** Get categories from DB */
  getCategories() {
    this.httpManager.get(this.main.settings.hostAddress + '/api/categories').then((result:Result) => {
      // Iterate through all projects
      forEach(result.data, (category:CategoryInterface) => {
        (category.visible == 't') ? category.visible = true : category.visible = false;
        (category.active == 't') ? category.active = true : category.active = false;

        this.main.categories.push(new Category(JSON.stringify(category)));
      });
      this.notifierService.notify(result.meta.status, result.meta.details[0]);
    });
  }

  /** Create new category in DB */
  createCategory() {
    let category = new Category(JSON.stringify({uuid: this.idGeneratorService.genUUID, label:"New category", active:true, visible:true}));
    this.httpManager.post(this.main.settings.hostAddress + '/api/category', category.toJSON()).then((result:Result) => {
      this.main.categories.push(category);
      this.notifierService.notify(result.meta.status, result.meta.details[0]);
    });
  }

  /** Update category in DB */
  updataCategory(uuid:string, category:Category) {
    this.httpManager.put(this.main.settings.hostAddress + '/api/category/'+uuid, category.toJSON()).then((result:Result) => {

      this.notifierService.notify(result.meta.status, result.meta.details[0]);
    });
  }

  /** Delete category */
  deleteCategory(uuid:string) {
    this.httpManager.delete(this.main.settings.hostAddress + '/api/category/'+uuid).then((result:Result) => {

      this.notifierService.notify(result.meta.status, result.meta.details[0]);
    });
  }

}
