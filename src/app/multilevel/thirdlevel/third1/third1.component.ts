import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-third1',
    templateUrl: './third1.component.html',
    styleUrls: ['./third1.component.sass'],
    imports: [RouterLink]
})
export class Third1Component implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
