// src/models.ts

export interface Person {
  id: string;           
  name: string;
  prepaidAmount: number;
  currentBalance?: number;
  isFavorite?: boolean;
  guardianName?: string;
  guardianPhone?: string;
  allowCredit?: boolean;
  
  paymentType?: 'weekly' | 'daily';
  lastPaymentDate?: string;         
}

export interface Purchase {
  id: string;
  personId: string;     
  date: string;         
  amount: number;       
  description?: string; 
}

export interface Payment {
  id: string;
  personId: string;
  date: string;
  amount: number;       
  type: 'prepaid' | 'debtPayment' | 'manualAdjustment';
  comment?: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'employee';
}