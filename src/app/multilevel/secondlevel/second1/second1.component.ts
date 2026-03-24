import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-second1',
    templateUrl: './second1.component.html',
    styleUrls: ['./second1.component.sass'],
    imports: [RouterLink]
})
export class Second1Component implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
