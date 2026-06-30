import { Component, OnInit } from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { Numerado, Producto } from 'app/ventas/models/model';

interface NumeradoForm {
  producto: Producto | null;
  numero: number;
  peso: number;
}

@Component({
  selector: 'app-edicion-numerados',
  imports: [],
  templateUrl: './edicion-numerados.component.html',
  styleUrl: './edicion-numerados.component.scss'
})
export class EdicionNumeradosComponent implements OnInit {
  form: FormGroup;

  productos: Producto[] = [];
  numerado: Numerado | null = null;

  constructor() {
    this.form = new FormGroup({
      producto: new FormControl<Producto | null>(null, Validators.required),
      numero: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
      peso: new FormControl<number | null>(null, [Validators.required, Validators.min(0.001)])
    });
  }
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const data = this.form.value as NumeradoForm;

    console.log('Formulario:', data);

    const payload = {
      productoCodigo: data.producto?.articulo,
      numero: data.numero,
      peso: data.peso
    };

    console.log('Payload backend:', payload);
  }
}
