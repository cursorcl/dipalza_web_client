import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-page500',
    templateUrl: './page500.component.html',
    styleUrls: ['./page500.component.sass'],
    imports: [RouterLink]
})
export class Page500Component implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
