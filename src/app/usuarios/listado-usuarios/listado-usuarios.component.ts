import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { UsuariosService } from '../usuarios.service';
import { Usuario } from '../models/model';
import { VerUsuarioComponent } from '../ver-usuario/ver-usuario.component';
import { CrearUsuarioComponent } from '../crear-usuario/crear-usuario.component';
import { ModificarUsuarioComponent } from '../modificar-usuario/modificar-usuario.component';
import { mostrarErrorToast } from '../toast.util';

@Component({
  selector: 'app-listado-usuarios',
  imports: [NgxDatatableModule, RouterLink],
  templateUrl: './listado-usuarios.component.html',
  styleUrl: './listado-usuarios.component.scss'
})
export class ListadoUsuariosComponent implements OnInit {
  loadingIndicator = true;
  reorderable = true;
  scrollBarHorizontal = window.innerWidth < 1200;

  rows: Usuario[] = [];
  temp: Usuario[] = [];

  private usuariosService = inject(UsuariosService);
  private destroyRef = inject(DestroyRef);
  private modalService = inject(NgbModal);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loadingIndicator = true;
    this.usuariosService.listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (usuarios) => {
          this.rows = usuarios;
          this.temp = usuarios;
          this.loadingIndicator = false;
        },
        error: (error: HttpErrorResponse) => {
          mostrarErrorToast('No se pudo cargar la lista de usuarios.');
          this.loadingIndicator = false;
        }
      });
  }

  updateFilter(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.toLowerCase();
    this.rows = this.temp.filter((u: Usuario) =>
      u.username.toLowerCase().indexOf(val) !== -1 ||
      (u.email ?? '').toLowerCase().indexOf(val) !== -1 || !val);
  }

  agregar(): void {
    const modalRef = this.modalService.open(CrearUsuarioComponent);
    modalRef.closed.subscribe(() => this.cargar());
  }

  ver(row: Usuario): void {
    const modalRef = this.modalService.open(VerUsuarioComponent);
    modalRef.componentInstance.usuario = row;
  }

  modificar(row: Usuario): void {
    const modalRef = this.modalService.open(ModificarUsuarioComponent);
    modalRef.componentInstance.usuario = row;
    modalRef.closed.subscribe(() => this.cargar());
  }

  toggleHabilitado(row: Usuario): void {
    Swal.fire({
      title: row.enabled ? 'Deshabilitar usuario' : 'Habilitar usuario',
      text: `¿${row.enabled ? 'Deshabilitar' : 'Habilitar'} a ${row.username}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }
      const peticion = row.enabled ? this.usuariosService.deshabilitar(row.id) : this.usuariosService.habilitar(row.id);
      peticion.subscribe({
        next: () => this.cargar(),
        error: () => { mostrarErrorToast('No se pudo actualizar el estado del usuario. Intente nuevamente.'); }
      });
    });
  }

  toggleBloqueado(row: Usuario): void {
    Swal.fire({
      title: row.locked ? 'Desbloquear usuario' : 'Bloquear usuario',
      text: `¿${row.locked ? 'Desbloquear' : 'Bloquear'} a ${row.username}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }
      const peticion = row.locked ? this.usuariosService.desbloquear(row.id) : this.usuariosService.bloquear(row.id);
      peticion.subscribe({
        next: () => this.cargar(),
        error: () => { mostrarErrorToast('No se pudo actualizar el bloqueo del usuario. Intente nuevamente.'); }
      });
    });
  }
}
