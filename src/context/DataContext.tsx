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
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface DataContextType {
  persons: Person[];
  purchases: Purchase[];
  payments: Payment[];
  loading: boolean;
  refreshData: () => Promise<void>;
  addPurchase: (purchase: Purchase) => Promise<void>;
  addPayment: (payment: Payment) => Promise<void>;
  addPerson: (person: Person) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  toggleFavorite: (personId: string) => Promise<void>;
  updatePrepaidAmount: (id: string, amount: number) => Promise<void>;
  editPerson: (updatedPerson: Person) => Promise<void>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const { username } = useAuth();

  const fetchCollections = useCallback(async () => {
    if (!username) return null;

    const [personsSnap, purchasesSnap, paymentsSnap] = await Promise.all([
      getDocs(collection(db, 'persons')),
      getDocs(collection(db, 'purchases')),
      getDocs(collection(db, 'payments')),
    ]);

    const personsData = personsSnap.docs.map((docSnap) => {
      const data = docSnap.data() as Person;
      return { ...data, id: data.id ?? docSnap.id };
    });

    const purchasesData = purchasesSnap.docs.map((docSnap) => {
      const data = docSnap.data() as Purchase;
      return { ...data, id: data.id ?? docSnap.id };
    });

    const paymentsData = paymentsSnap.docs.map((docSnap) => {
      const data = docSnap.data() as Payment;
      return { ...data, id: data.id ?? docSnap.id };
    });

    return { personsData, purchasesData, paymentsData };
  }, [username]);

  const refreshData = useCallback(async () => {
    try {
      const data = await fetchCollections();
      if (!data) {
        setPersons([]);
        setPurchases([]);
        setPayments([]);
        return;
      }

      setPersons(data.personsData);
      setPurchases(data.purchasesData);
      setPayments(data.paymentsData);
    } catch (error) {
      console.error('Error al refrescar datos desde Firebase:', error);
      Alert.alert('Error', 'No se pudieron obtener los datos más recientes.');
    }
  }, [fetchCollections]);

  useEffect(() => {
    let active = true;

    const loadInitialData = async () => {
      if (!username) {
        setPersons([]);
        setPurchases([]);
        setPayments([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await fetchCollections();
        if (!active || !data) return;
        setPersons(data.personsData);
        setPurchases(data.purchasesData);
        setPayments(data.paymentsData);
      } catch (error) {
        console.error('Error al cargar datos desde Firebase:', error);
        if (active) {
          Alert.alert('Error', 'No se pudieron cargar los datos.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      active = false;
    };
  }, [username, fetchCollections]);

  // === Agregar elementos ===
  const addPerson = async (person: Person) => {
    try {
      await setDoc(doc(db, 'persons', person.id), person);
      setPersons((prev) => {
        const others = prev.filter((p) => p.id !== person.id);
        return [...others, person];
      });
    } catch (error) {
      console.error('Error al agregar persona:', error);
      Alert.alert('Error', 'No se pudo agregar la persona.');
      throw error;
    }
  };

  const editPerson = async (updatedPerson: Person) => {
    try {
      await setDoc(doc(db, 'persons', updatedPerson.id), updatedPerson);
      setPersons((prev) =>
        prev.map((person) => (person.id === updatedPerson.id ? updatedPerson : person))
      );
    } catch (error) {
      console.error('Error al editar persona:', error);
      Alert.alert('Error', 'No se pudo actualizar la persona.');
      throw error;
    }
  };

  const addPurchase = async (purchase: Purchase) => {
    try {
      await setDoc(doc(db, 'purchases', purchase.id), purchase);
      setPurchases((prev) => {
        const others = prev.filter((p) => p.id !== purchase.id);
        return [...others, purchase];
      });
    } catch (error) {
      console.error('Error al agregar compra:', error);
      Alert.alert('Error', 'No se pudo registrar la compra.');
      throw error;
    }
  };

  const addPayment = async (payment: Payment) => {
    try {
      await setDoc(doc(db, 'payments', payment.id), payment);
      setPayments((prev) => {
        const others = prev.filter((p) => p.id !== payment.id);
        return [...others, payment];
      });

      if (payment.type === 'prepaid') {
        await updatePrepaidAmount(payment.personId, payment.amount);
      }
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
      await updateDoc(doc(db, 'persons', personId), {
        isFavorite: updatedValue,
      });

      setPersons((prev) =>
        prev.map((p) => (p.id === personId ? { ...p, isFavorite: updatedValue } : p))
      );
    } catch (error) {
      console.error('Error al cambiar favorito:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado de favorito.');
      throw error;
    }
  };

  const updatePrepaidAmount = async (id: string, amount: number) => {
    try {
      const person = persons.find((p) => p.id === id);
      if (!person) return;

      const newAmount = (person.prepaidAmount || 0) + amount;
      await updateDoc(doc(db, 'persons', id), {
        prepaidAmount: newAmount,
      });

      setPersons((prev) =>
        prev.map((p) => (p.id === id ? { ...p, prepaidAmount: newAmount } : p))
      );
    } catch (error) {
      console.error('Error al actualizar el prepago:', error);
      Alert.alert('Error', 'No se pudo actualizar el saldo de prepago.');
      throw error;
    }
  };

  const deletePerson = async (id: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'persons', id));

      const purchasesQuery = query(collection(db, 'purchases'), where('personId', '==', id));
      const purchaseSnap = await getDocs(purchasesQuery);
      purchaseSnap.forEach((docSnap) => batch.delete(doc(db, 'purchases', docSnap.id)));

      const paymentsQuery = query(collection(db, 'payments'), where('personId', '==', id));
      const paymentSnap = await getDocs(paymentsQuery);
      paymentSnap.forEach((docSnap) => batch.delete(doc(db, 'payments', docSnap.id)));

      await batch.commit();

      setPersons((prev) => prev.filter((person) => person.id !== id));
      setPurchases((prev) => prev.filter((purchase) => purchase.personId !== id));
      setPayments((prev) => prev.filter((payment) => payment.personId !== id));
    } catch (error) {
      console.error('Error al eliminar persona:', error);
      Alert.alert('Error', 'No se pudo eliminar la persona.');
      throw error;
    }
  };

  return (
    <DataContext.Provider
      value={{
        persons,
        purchases,
        payments,
        loading,
        refreshData,
        addPurchase,
        addPayment,
        addPerson,
        deletePerson,
        toggleFavorite,
        updatePrepaidAmount,
        editPerson,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
