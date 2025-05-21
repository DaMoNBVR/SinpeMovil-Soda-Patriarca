import React, { createContext, useState, ReactNode } from 'react';
import { Person, Purchase, Payment } from '../models';

interface DataContextType {
  persons: Person[];
  purchases: Purchase[];
  payments: Payment[];
  addPurchase: (purchase: Purchase) => void;
  addPayment: (payment: Payment) => void;
  addPerson: (person: Person) => void;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const initialPersons: Person[] = [
    { id: 'student1', name: 'Juan Pérez', type: 'student', prepaidAmount: 0 },
    { id: 'teacher1', name: 'Sra. Gómez', type: 'teacher', prepaidAmount: 0 },
  ];

  const [persons, setPersons] = useState<Person[]>(initialPersons);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const addPurchase = (purchase: Purchase) => setPurchases(prev => [...prev, purchase]);
  const addPayment = (payment: Payment) => setPayments(prev => [...prev, payment]);
  const addPerson = (person: Person) => setPersons(prev => [...prev, person]);

  return (
    <DataContext.Provider value={{ persons, purchases, payments, addPurchase, addPayment, addPerson }}>
      {children}
    </DataContext.Provider>
  );
};
