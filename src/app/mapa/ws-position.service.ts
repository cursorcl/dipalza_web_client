import { Injectable } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import { Subject, Observable } from 'rxjs';
import { PosicionDTO, VentaPosicionEventoDTO } from './models/model';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WSPositionService {
  private stompClient: Client;
  private posicionSubject = new Subject<PosicionDTO>();
  private ventaFinalizadaSubject = new Subject<VentaPosicionEventoDTO>();

  constructor() {
    this.stompClient = new Client({
      brokerURL: `${environment.wsUrl}`,
      debug: (str) => { console.log(str); },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = (frame) => {
      console.log('Conectado al WebSocket de Posiciones');
      
      // Suscripción al tópico definido en el SimpMessagingTemplate
      this.stompClient.subscribe('/topic/posiciones', (message: Message) => {
        const posicion: PosicionDTO = JSON.parse(message.body);
        this.posicionSubject.next(posicion);
      });

      // Ventas finalizadas: la vista Ventas del mapa se recarga si corresponde.
      this.stompClient.subscribe('/topic/ventas-posicion', (message: Message) => {
        this.ventaFinalizadaSubject.next(JSON.parse(message.body));
      });
    };

    this.stompClient.onStompError = (frame) => {
      console.error('Error de STOMP:', frame.headers['message']);
    };
  }

  /**
   * Activa el cliente STOMP si no lo está ya. Idempotente: hace falta
   * llamarlo en cada visita a la página del mapa, porque `disconnect()`
   * desactiva este cliente compartido (root) al salir de la página.
   */
  connect(): void {
    if (!this.stompClient.active) {
      this.stompClient.activate();
    }
  }

  /**
   * Expone las posiciones como un Observable para que los componentes se suscriban
   */
  getPositions$(): Observable<PosicionDTO> {
    return this.posicionSubject.asObservable();
  }

  /** Avisos de ventas finalizadas (vendedor, día y venta). */
  getVentasFinalizadas$(): Observable<VentaPosicionEventoDTO> {
    return this.ventaFinalizadaSubject.asObservable();
  }

  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
    }
  }
}