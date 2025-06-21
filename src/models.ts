// src/models.ts

export type PersonType = 'student' | 'teacher';

export interface Person {
  id: string;           // identificador único (puede ser UUID o código)
  name: string;
  type: PersonType;
  prepaidAmount: number;
  isFavorite?: boolean; // monto pagado por adelantado (en colones)
}

export interface Purchase {
  id: string;
  personId: string;     // a quién se le hizo la compra (student o teacher)
  date: string;         // fecha en formato ISO (yyyy-mm-dd)
  amount: number;       // monto de la compra
  description?: string; // opcional: descripción del producto
}

export interface Payment {
  id: string;
  personId: string;
  date: string;
  amount: number;       // pago que hace el padre (puede ser para abonar deuda o prepago)
  type: 'prepaid' | 'debtPayment';
}
