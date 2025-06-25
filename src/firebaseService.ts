// src/firebaseService.ts

import { collection, addDoc, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Person, Purchase, Payment } from './models';

// === Personas ===

export const addPersonToFirebase = async (person: Person) => {
  await addDoc(collection(db, 'persons'), person);
};

export const getAllPersons = async (): Promise<Person[]> => {
  const snapshot = await getDocs(collection(db, 'persons'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person));
};

// === Compras ===

export const addPurchaseToFirebase = async (purchase: Purchase) => {
  await addDoc(collection(db, 'purchases'), purchase);
};

export const getAllPurchases = async (): Promise<Purchase[]> => {
  const snapshot = await getDocs(collection(db, 'purchases'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase));
};

// === Pagos ===

export const addPaymentToFirebase = async (payment: Payment) => {
  await addDoc(collection(db, 'payments'), payment);
};

export const getAllPayments = async (): Promise<Payment[]> => {
  const snapshot = await getDocs(collection(db, 'payments'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
};

// === Tiempo real (suscripciones) ===

export const subscribeToCollection = (collectionName: string, callback: (data: any[]) => void) => {
  return onSnapshot(collection(db, collectionName), snapshot => {
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(docs);
  });
};

// === Actualizar persona (ej: monto o favorito) ===

export const updatePersonInFirebase = async (id: string, updates: Partial<Person>) => {
  const ref = doc(db, 'persons', id);
  await updateDoc(ref, updates);
};
