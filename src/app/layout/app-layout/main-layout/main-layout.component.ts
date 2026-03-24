import { Direction } from '@angular/cdk/bidi';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RightSidebarComponent } from '../../right-sidebar/right-sidebar.component';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { HeaderComponent } from '../../header/header.component';
import { DirectionService, InConfiguration } from '@core';
import { ConfigService } from '@config/config.service';

@Component({
    selector: 'app-main-layout',
    templateUrl: './main-layout.component.html',
    styleUrls: [],
    imports: [
        HeaderComponent,
        SidebarComponent,
        RightSidebarComponent,
        RouterOutlet,
    ]
})
export class MainLayoutComponent {
  direction!: Direction;
  public config!: InConfiguration;
  constructor(
    private directoryService: DirectionService,
    private configService: ConfigService
  ) {
    this.config = this.configService.configData;
    this.directoryService.currentData.subscribe((currentData) => {
      if (currentData) {
        this.direction = currentData === 'ltr' ? 'ltr' : 'rtl';
      } else {
        if (localStorage.getItem('isRtl')) {
          if (localStorage.getItem('isRtl') === 'true') {
            this.direction = 'rtl';
          } else if (localStorage.getItem('isRtl') === 'false') {
            this.direction = 'ltr';
          }
        }
      }
    });
  }
}
