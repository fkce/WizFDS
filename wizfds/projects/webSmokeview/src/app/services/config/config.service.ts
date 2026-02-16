import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface IAppConfig {
  name: string;
  host: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  static settings: IAppConfig;

  constructor(private http: HttpClient) { }

  public load() {
    const jsonFile = `assets/config/config.${environment.name}.json`;
    return new Promise<void>((resolve, reject) => {
      firstValueFrom(this.http.get<IAppConfig>(jsonFile)).then((response: IAppConfig) => {
        ConfigService.settings = <IAppConfig>response;
        resolve();
      }).catch((response: any) => {
        reject(`Could not load file '${jsonFile}': ${JSON.stringify(response)}`);
      });
    });
  }
}
