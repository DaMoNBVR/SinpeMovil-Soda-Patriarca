// src/context/DataContext.tsx
import React, { createContext, useState, ReactNode } from 'react';
import { Person, Purchase, Payment } from '../models';

interface DataContextType {
  persons: Person[];
  purchases: Purchase[];
  payments: Payment[];
  addPurchase: (purchase: Purchase) => void;
  addPayment: (payment: Payment) => void;
  addPerson: (person: Person) => void;
  toggleFavorite: (personId: string) => void;
  updatePrepaidAmount: (id: string, amount: number) => void;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const initialPersons: Person[] = [
    { id: 'student1', name: 'Juan Pérez', type: 'student', prepaidAmount: 0, isFavorite: false },
    { id: 'teacher1', name: 'Sra. Gómez', type: 'teacher', prepaidAmount: 0, isFavorite: true },
    { id: 'student2', name: 'Ana Ramírez', type: 'student', prepaidAmount: 0, isFavorite: false },
    { id: 'student3', name: 'Carlos Quesada', type: 'student', prepaidAmount: 0, isFavorite: false },
    { id: 'student4', name: 'María Rodríguez', type: 'student', prepaidAmount: 0, isFavorite: true },
    { id: 'teacher2', name: 'Prof. Víquez', type: 'teacher', prepaidAmount: 0, isFavorite: false },
    { id: 'student5', name: 'Luis Castro', type: 'student', prepaidAmount: 0, isFavorite: false },
    { id: 'student6', name: 'Gabriela Mora', type: 'student', prepaidAmount: 0, isFavorite: false },
    { id: 'student7', name: 'Esteban Pineda', type: 'student', prepaidAmount: 0, isFavorite: false },
    { id: 'student8', name: 'Daniela Solís', type: 'student', prepaidAmount: 0, isFavorite: false },
  ];

  const [persons, setPersons] = useState<Person[]>(initialPersons);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const addPurchase = (purchase: Purchase) => setPurchases(prev => [...prev, purchase]);

  const updatePrepaidAmount = (id: string, amount: number) => {
    setPersons((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, prepaidAmount: (p.prepaidAmount || 0) + amount } : p
      )
    );
  };

  const addPayment = (payment: Payment) => {
    setPayments(prev => [...prev, payment]);

    if (payment.type === 'prepaid') {
      updatePrepaidAmount(payment.personId, payment.amount);
    }
  };

  const addPerson = (person: Person) => setPersons(prev => [...prev, person]);

  const toggleFavorite = (personId: string) => {
    setPersons(prev =>
      prev.map(person =>
        person.id === personId ? { ...person, isFavorite: !person.isFavorite } : person
      )
    );
  };

  return (
    <DataContext.Provider value={{
      persons,
      purchases,
      payments,
      addPurchase,
      addPayment,
      addPerson,
      toggleFavorite,
      updatePrepaidAmount,
    }}>
      {children}
    </DataContext.Provider>
  );
};
