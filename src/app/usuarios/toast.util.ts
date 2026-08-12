import Swal from 'sweetalert2';

export function mostrarErrorToast(mensaje: string): void {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'error',
    title: mensaje,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  });
}
