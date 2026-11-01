import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-page404',
    templateUrl: './page404.component.html',
    styleUrls: ['./page404.component.sass'],
    imports: [RouterLink]
})
export class Page404Component implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
