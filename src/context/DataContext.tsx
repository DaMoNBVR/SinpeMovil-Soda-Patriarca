import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { Person, Purchase, Payment } from '../models';
import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';

interface DataContextType {
  persons: Person[];
  purchases: Purchase[];
  payments: Payment[];
  addPurchase: (purchase: Purchase) => void;
  addPayment: (payment: Payment) => void;
  addPerson: (person: Person) => void;
  deletePerson: (id: string) => void;
  toggleFavorite: (personId: string) => void;
  updatePrepaidAmount: (id: string, amount: number) => void;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // === Sincronización en tiempo real ===
  useEffect(() => {
    const unsubPersons = onSnapshot(collection(db, 'persons'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Person[];
      setPersons(data);
    });

    const unsubPurchases = onSnapshot(collection(db, 'purchases'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data()) as Purchase[];
      setPurchases(data);
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data()) as Payment[];
      setPayments(data);
    });

    return () => {
      unsubPersons();
      unsubPurchases();
      unsubPayments();
    };
  }, []);

  // === Agregar elementos ===
  const addPerson = async (person: Person) => {
    await setDoc(doc(db, 'persons', person.id), person);
  };

  const addPurchase = async (purchase: Purchase) => {
    await addDoc(collection(db, 'purchases'), purchase);
  };

  const addPayment = async (payment: Payment) => {
    await addDoc(collection(db, 'payments'), payment);

    if (payment.type === 'prepaid') {
      updatePrepaidAmount(payment.personId, payment.amount);
    }
  };

  const toggleFavorite = async (personId: string) => {
    const person = persons.find(p => p.id === personId);
    if (person) {
      await updateDoc(doc(db, 'persons', personId), {
        isFavorite: !person.isFavorite,
      });
    }
  };

  const updatePrepaidAmount = async (id: string, amount: number) => {
    const person = persons.find(p => p.id === id);
    if (person) {
      const newAmount = (person.prepaidAmount || 0) + amount;
      await updateDoc(doc(db, 'persons', id), {
        prepaidAmount: newAmount,
      });
    }
  };

  const deletePerson = async (id: string) => {
    // Eliminar la persona
    await deleteDoc(doc(db, 'persons', id));

    // Eliminar compras relacionadas
    const purchaseSnap = await getDocs(collection(db, 'purchases'));
    const toDeletePurchases = purchaseSnap.docs.filter(doc => doc.data().personId === id);
    for (const p of toDeletePurchases) {
      await deleteDoc(doc(db, 'purchases', p.id));
    }

    // Eliminar pagos relacionados
    const paymentSnap = await getDocs(collection(db, 'payments'));
    const toDeletePayments = paymentSnap.docs.filter(doc => doc.data().personId === id);
    for (const p of toDeletePayments) {
      await deleteDoc(doc(db, 'payments', p.id));
    }
  };

  return (
    <DataContext.Provider
      value={{
        persons,
        purchases,
        payments,
        addPurchase,
        addPayment,
        addPerson,
        deletePerson,
        toggleFavorite,
        updatePrepaidAmount,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
