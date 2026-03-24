import { Injectable } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import { Subject, Observable } from 'rxjs';
import { PosicionDTO } from './models/model';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WSPositionService {
  private stompClient: Client;
  private posicionSubject = new Subject<PosicionDTO>();

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
    };

    this.stompClient.onStompError = (frame) => {
      console.error('Error de STOMP:', frame.headers['message']);
    };

    this.stompClient.activate();
  }

  /**
   * Expone las posiciones como un Observable para que los componentes se suscriban
   */
  getPositions$(): Observable<PosicionDTO> {
    return this.posicionSubject.asObservable();
  }

  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
    }
  }
}