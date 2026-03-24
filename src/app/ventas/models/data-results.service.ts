import { Injectable } from "@angular/core";
import { VentaFacturaResultado } from "./model";

/**
 * Servicio para compartir datos entre listado de ventas y resultados de facturación.
 */
@Injectable({ providedIn: 'root' })
export class DataResultService {
    private results: VentaFacturaResultado[] = [];

    setResults(results: VentaFacturaResultado[]) {
        this.results = results;
    }

    getResults(): VentaFacturaResultado[] {
        return this.results;
    }
}