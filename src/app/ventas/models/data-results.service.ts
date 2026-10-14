import { Injectable } from "@angular/core";
import { VendedorResultadoDTO } from "./model";

/**
 * Servicio para compartir datos entre listado de ventas y resultados de facturación.
 */
@Injectable({ providedIn: 'root' })
export class DataResultService {
    private porVendedor: VendedorResultadoDTO[] = [];

    setPorVendedor(porVendedor: VendedorResultadoDTO[]) {
        this.porVendedor = porVendedor;
    }

    getPorVendedor(): VendedorResultadoDTO[] {
        return this.porVendedor;
    }
}
