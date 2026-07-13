/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DivisaType = 'USD' | 'EUR' | 'PEN';

export interface Operacion {
  ID: string;
  Fecha: string; // YYYY-MM-DD
  Hora: string;  // HH:MM:SS
  TipoOperacion: 'Compra' | 'Venta';
  Divisa: DivisaType;
  Cantidad: number;
  TipoCambio: number;
  TotalBs: number;
}

export interface TasaCambio {
  Compra: number;
  Venta: number;
}

export interface Configuracion {
  USD: TasaCambio;
  EUR: TasaCambio;
  PEN: TasaCambio;
  SaldosIniciales?: {
    USD: number;
    EUR: number;
    PEN: number;
    BOB: number;
  };
}
