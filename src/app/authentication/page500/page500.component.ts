import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-page500',
    templateUrl: './page500.component.html',
    styleUrls: ['./page500.component.sass'],
    imports: [FormsModule, RouterLink]
})
export class Page500Component implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
