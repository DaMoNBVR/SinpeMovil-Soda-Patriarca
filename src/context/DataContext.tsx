import React, { createContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Alert } from 'react-native';
import { Person, Purchase, Payment } from '../models';
import { db } from '../firebaseConfig';
import {
  collection,
  doc,
  updateDoc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  writeBatch, // <--- LA CLAVE DE LA SEGURIDAD
  increment,
  orderBy,
  addDoc
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface DataContextType {
  persons: Person[];
  loading: boolean;
  refreshData: () => Promise<void>;
  addPurchase: (purchase: Purchase) => Promise<void>;
  addPayment: (payment: Payment) => Promise<void>;
  addPerson: (data: { name: string; guardianName?: string; guardianPhone?: string }) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  toggleFavorite: (personId: string) => Promise<void>;
  updatePrepaidAmount: (id: string, amount: number) => Promise<void>;
  editPerson: (updatedPerson: Person) => Promise<void>;
  getPersonTransactions: (personId: string) => Promise<{ purchases: Purchase[]; payments: Payment[] }>;
  getTransactionsByDateRange: (startDate: string, endDate: string) => Promise<{ purchases: Purchase[]; payments: Payment[] }>;
  recalculatePersonBalance: (personId: string) => Promise<void>;
  loadMorePersons: () => Promise<void>;
  loadingMore: boolean;
  hasMore: boolean;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore] = useState<boolean>(false);
  const [hasMore] = useState<boolean>(false);

  const { username } = useAuth();

  const fetchPersons = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'persons'), orderBy('name'));
      const snapshot = await getDocs(q);
      const allPersons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person));
      setPersons(allPersons);
    } catch (error) {
      console.error('Error fetching persons:', error);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (username) {
      fetchPersons();
    }
  }, [username]);

  const refreshData = async () => {
    await fetchPersons();
  };

  const loadMorePersons = async () => {};

  const reloadSinglePerson = async (personId: string) => {
    try {
      const personRef = doc(db, 'persons', personId);
      const personSnap = await getDoc(personRef);
      if (personSnap.exists()) {
        const updatedPerson = { id: personSnap.id, ...personSnap.data() } as Person;
        setPersons(prev => prev.map(p => p.id === personId ? updatedPerson : p));
      }
    } catch (e) {
      console.error("Error recargando persona:", e);
    }
  };

  // --- FUNCIÓN DE SEGURIDAD (Recalcular Saldo Real) ---
  const recalculatePersonBalance = async (personId: string) => {
    try {
        console.log(`Recalculando saldo para: ${personId}...`);
        const purchasesQ = query(collection(db, 'purchases'), where('personId', '==', personId));
        const paymentsQ = query(collection(db, 'payments'), where('personId', '==', personId));
        
        const [purchasesSnap, paymentsSnap] = await Promise.all([
            getDocs(purchasesQ),
            getDocs(paymentsQ)
        ]);

        let totalDebt = 0;
        let totalPaid = 0;

        purchasesSnap.forEach(doc => { totalDebt += (doc.data().amount || 0); });
        paymentsSnap.forEach(doc => { totalPaid += (doc.data().amount || 0); });

        const realBalance = totalPaid - totalDebt;

        // Actualizamos sin batch aquí porque es una corrección, pero directo a la fuente
        await updateDoc(doc(db, 'persons', personId), { currentBalance: realBalance });
        setPersons(prev => prev.map(p => p.id === personId ? { ...p, currentBalance: realBalance } : p));
        
        Alert.alert("Éxito", `Saldo sincronizado a: ₡${realBalance}`);
    } catch (error) {
        console.error("Error recalculando:", error);
        Alert.alert("Error", "No se pudo recalcular el saldo.");
    }
  };

  // --- TRANSACCIÓN ATÓMICA: AGREGAR PERSONA ---
  const addPerson = async (data: { name: string; guardianName?: string; guardianPhone?: string }) => {
    if (typeof data !== 'object' || !data.name) {
         Alert.alert("Error", "Datos inválidos.");
         return;
    }
    try {
      const safeName = data.name.trim();
      const newPersonData = {
        name: safeName,
        guardianName: data.guardianName || '',
        guardianPhone: data.guardianPhone || '',
        isFavorite: false,
        currentBalance: 0,
        prepaidAmount: 0, 
        createdAt: new Date().toISOString()
      };
      
      // En addPerson no necesitamos batch complejo, pero usamos la referencia limpia
      const docRef = await addDoc(collection(db, 'persons'), newPersonData);
      const newPerson: Person = { id: docRef.id, ...newPersonData };
      setPersons((prev) => [...prev, newPerson].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error al agregar persona:', error);
      Alert.alert('Error', 'No se pudo agregar la persona.');
    }
  };

  const updatePrepaidAmount = async (id: string, amount: number) => {
    try {
      // Usamos updateDoc simple aquí, no crítico para el balance global de deuda
      const person = persons.find((p) => p.id === id);
      if (!person) return;
      const newAmount = (person.prepaidAmount || 0) + amount;
      await updateDoc(doc(db, 'persons', id), { prepaidAmount: newAmount });
      setPersons(prev => prev.map(p => p.id === id ? { ...p, prepaidAmount: newAmount } : p));
    } catch (error) { console.error(error); throw error; }
  };

  // --- TRANSACCIÓN ATÓMICA: COMPRA ---
  const addPurchase = async (purchase: Purchase) => {
    try {
      // Usamos BATCH para asegurar que si falla uno, fallen los dos
      const batch = writeBatch(db);

      // 1. Crear el recibo de compra
      const purchaseRef = doc(db, 'purchases', purchase.id);
      batch.set(purchaseRef, purchase);

      // 2. Actualizar el saldo de la persona
      const personRef = doc(db, 'persons', purchase.personId);
      batch.update(personRef, {
        currentBalance: increment(-purchase.amount)
      });

      // 3. Ejecutar todo junto atómicamente
      await batch.commit();

      // 4. Actualizar UI (Recarga segura)
      await reloadSinglePerson(purchase.personId);
    } catch (error) {
      console.error('Error al agregar compra:', error);
      Alert.alert('Error', 'No se pudo registrar la compra.');
      throw error;
    }
  };

  // --- TRANSACCIÓN ATÓMICA: PAGO ---
  const addPayment = async (payment: Payment) => {
    try {
      const batch = writeBatch(db);

      // 1. Crear el recibo de pago
      const paymentRef = doc(db, 'payments', payment.id);
      batch.set(paymentRef, payment);

      // 2. Actualizar el saldo de la persona
      const personRef = doc(db, 'persons', payment.personId);
      batch.update(personRef, {
        currentBalance: increment(payment.amount)
      });

      // 3. Ejecutar todo junto
      await batch.commit();
      
      // Lógica de prepago (secundaria)
      if (payment.type === 'prepaid') {
        await updatePrepaidAmount(payment.personId, payment.amount);
      }

      // 4. Actualizar UI
      await reloadSinglePerson(payment.personId);

    } catch (error) {
      console.error('Error al agregar pago:', error);
      Alert.alert('Error', 'No se pudo registrar el pago.');
      throw error;
    }
  };

  const toggleFavorite = async (personId: string) => {
    try {
      const person = persons.find((p) => p.id === personId);
      if (!person) return;
      const updatedValue = !(person.isFavorite ?? false);
      setPersons((prev) => prev.map((p) => (p.id === personId ? { ...p, isFavorite: updatedValue } : p)));
      await updateDoc(doc(db, 'persons', personId), { isFavorite: updatedValue });
    } catch (error) { console.error(error); }
  };

  const editPerson = async (updatedPerson: Person) => {
    try {
      await updateDoc(doc(db, 'persons', updatedPerson.id), { 
        name: updatedPerson.name,
        guardianName: updatedPerson.guardianName,
        guardianPhone: updatedPerson.guardianPhone
      });
      setPersons((prev) => prev.map((person) => (person.id === updatedPerson.id ? updatedPerson : person)));
    } catch (error) { throw error; }
  };

  const deletePerson = async (id: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'persons', id));
      await batch.commit();
      setPersons((prev) => prev.filter((person) => person.id !== id));
    } catch (error) {
      console.error('Error al eliminar:', error);
      Alert.alert('Error', 'No se pudo eliminar.');
      throw error;
    }
  };

  const getPersonTransactions = async (personId: string) => {
     try {
      const purchasesQ = query(collection(db, 'purchases'), where('personId', '==', personId));
      const paymentsQ = query(collection(db, 'payments'), where('personId', '==', personId));
      const [pSnap, paySnap] = await Promise.all([getDocs(purchasesQ), getDocs(paymentsQ)]);
      const purchases = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase));
      const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
      purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return { purchases, payments };
    } catch (e) { return { purchases: [], payments: [] }; }
  };

  const getTransactionsByDateRange = async (startDate: string, endDate: string) => {
     try {
      const pQ = query(collection(db, 'purchases'), where('date', '>=', startDate), where('date', '<=', endDate));
      const payQ = query(collection(db, 'payments'), where('date', '>=', startDate), where('date', '<=', endDate));
      const [pSnap, paySnap] = await Promise.all([getDocs(pQ), getDocs(payQ)]);
      const purchases = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase));
      const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
      return { purchases, payments };
    } catch (e) { return { purchases: [], payments: [] }; }
  };

  return (
    <DataContext.Provider value={{
        persons, loading, refreshData, loadMorePersons, addPurchase, addPayment, addPerson, 
        deletePerson, toggleFavorite, updatePrepaidAmount, editPerson, getPersonTransactions, 
        getTransactionsByDateRange, recalculatePersonBalance, loadingMore: false, hasMore: false
      }}>
      {children}
    </DataContext.Provider>
  );
};