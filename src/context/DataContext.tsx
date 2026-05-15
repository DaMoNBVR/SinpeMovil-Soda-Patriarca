import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import { Person, Purchase, Payment } from '../models';
import { db } from '../firebaseConfig';
import {
  collection,
  doc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  writeBatch,
  increment,
  orderBy,
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface DataContextType {
  persons: Person[];
  loading: boolean;
  refreshData: () => Promise<void>;
  addPurchase: (purchase: Purchase) => Promise<void>;
  addPayment: (payment: Payment) => Promise<void>;
  addPerson: (data: { name: string; guardianName?: string; guardianPhone?: string; allowCredit?: boolean; paymentType?: 'weekly' | 'daily'}) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  toggleFavorite: (personId: string) => Promise<void>;
  updatePrepaidAmount: (id: string, amount: number) => Promise<void>;
  editPerson: (updatedPerson: Person) => Promise<void> ;
  getPersonTransactions: (personId: string) => Promise<{ purchases: Purchase[]; payments: Payment[] }>;
  getTransactionsByDateRange: (startDate: string, endDate: string) => Promise<{ purchases: Purchase[]; payments: Payment[] }>;
  recalculatePersonBalance: (personId: string) => Promise<void>;
  loadMorePersons: () => Promise<void>;
  syncAllBalances: () => Promise<void>;
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

  //onSnapshot
  useEffect(() => {
    if (!username) return;

    setLoading(true);
    const q = query(collection(db, 'persons'), orderBy('name'));

    // Abrimos el "túnel" de conexión con Firebase
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allPersons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person));
      setPersons(allPersons);
      setLoading(false);
    }, (error) => {
      console.error('Error escuchando a las personas en tiempo real:', error);
      setLoading(false);
    });

    // Cerramos el túnel si el usuario sale de la app o cierra sesión
    return () => unsubscribe();
  }, [username]);

  // Mantenemos esta función para que los Pull-to-Refresh de las listas no tiren error.
  const refreshData = async () => {
    // Simulamos una pequeña espera visual para mantener la UX, pero ya está sincronizado.
    return new Promise<void>(resolve => setTimeout(resolve, 500));
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

  // Recalcular Saldo Real y Último Pago (Corrección Manual)
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
        let latestPaymentDate: string | null = null; // ⚡ NUEVO: Para cazar el último pago

        purchasesSnap.forEach(doc => { totalDebt += (doc.data().amount || 0); });
        
        paymentsSnap.forEach(doc => { 
            const payData = doc.data();
            totalPaid += (payData.amount || 0); 

            // ⚡ Comparamos fechas para encontrar el pago más nuevo
            if (payData.date) {
                if (!latestPaymentDate || new Date(payData.date) > new Date(latestPaymentDate)) {
                    latestPaymentDate = payData.date;
                }
            }
        });

        const realBalance = totalPaid - totalDebt;

        // ⚡ Preparamos los datos a actualizar en Firebase
        const updateData: any = { currentBalance: realBalance };
        if (latestPaymentDate) {
            updateData.lastPaymentDate = latestPaymentDate; // Le inyectamos la fecha correcta
        }

        await updateDoc(doc(db, 'persons', personId), updateData);
        
        Alert.alert(
            "Éxito", 
            `Saldo sincronizado a: ₡${realBalance}\nÚltimo pago detectado: ${latestPaymentDate ? new Date(latestPaymentDate).toLocaleDateString('es-CR') : 'Ninguno'}`
        );
    } catch (error) {
        console.error("Error recalculando:", error);
        Alert.alert("Error", "No se pudo recalcular el saldo.");
    }
  };

  // Sincronizar a TODOS de golpe (Solo para Admin)
  const syncAllBalances = async () => {
    try {
      Alert.alert("Iniciando...", "Sincronizando a todos los clientes. No cierres la app...");
      
      // Recorremos a todas las personas y usamos la función que ya creamos
      for (const person of persons) {
        await recalculatePersonBalance(person.id);
      }

      Alert.alert("¡Éxito Total!", "Todos los historiales fueron analizados y sanados. 🏥");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "La sincronización masiva falló.");
    }
  };

  // Agregamos validación básica para evitar datos basura y errores de UI. La función sigue siendo asíncrona porque interactúa con la base de datos.
  const addPerson = async (data: { name: string; guardianName?: string; guardianPhone?: string; allowCredit?: boolean; paymentType?: 'weekly' | 'daily' }) => {
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
        createdAt: new Date().toISOString(),
        allowCredit: data.allowCredit !== undefined ? data.allowCredit : true,
        paymentType: data.paymentType || 'weekly'
      };
      
      await addDoc(collection(db, 'persons'), newPersonData);
      // No hacemos setPersons manual; onSnapshot actualizará la lista solo
    } catch (error) {
      console.error('Error al agregar persona:', error);
      Alert.alert('Error', 'No se pudo agregar la persona.');
    }
  };

  const updatePrepaidAmount = async (id: string, amount: number) => {
    try {
      const person = persons.find((p) => p.id === id);
      if (!person) return;
      const newAmount = (person.prepaidAmount || 0) + amount;
      await updateDoc(doc(db, 'persons', id), { prepaidAmount: newAmount });
    } catch (error) { console.error(error); throw error; }
  };

 // compra y pago son transacciones atómicas: si falla una parte, no se registra nada. Esto evita inconsistencias en el balance.
  const addPurchase = async (purchase: Purchase) => {
    try {
      const batch = writeBatch(db);
      const purchaseRef = doc(db, 'purchases', purchase.id);
      batch.set(purchaseRef, purchase);

      const personRef = doc(db, 'persons', purchase.personId);
      batch.update(personRef, {
        currentBalance: increment(-purchase.amount)
      });

      await batch.commit();
      
      //onSnapshot se encargará de la UI general, pero mantenemos esto por redundancia de seguridad
      await reloadSinglePerson(purchase.personId);
    } catch (error) {
      console.error('Error al agregar compra:', error);
      Alert.alert('Error', 'No se pudo registrar la compra. Revise su conexión.');
      throw error;
    }
  };

  // Similar a addPurchase, pero para pagos. Si es un pago prepago, también actualizamos el monto prepago. Todo en una sola transacción para evitar inconsistencias.
  const addPayment = async (payment: Payment) => {
    try {
      const batch = writeBatch(db);
      const paymentRef = doc(db, 'payments', payment.id);
      batch.set(paymentRef, payment);

      const personRef = doc(db, 'persons', payment.personId);
      batch.update(personRef, {
        currentBalance: increment(payment.amount),
        lastPaymentDate: payment.date
      });

      await batch.commit();
      
      if (payment.type === 'prepaid') {
        await updatePrepaidAmount(payment.personId, payment.amount);
      }
      
      await reloadSinglePerson(payment.personId);
    } catch (error) {
      console.error('Error al agregar pago:', error);
      Alert.alert('Error', 'No se pudo registrar el pago. Revise su conexión.');
      throw error;
    }
  };

  const toggleFavorite = async (personId: string) => {
    try {
      const person = persons.find((p) => p.id === personId);
      if (!person) return;
      const updatedValue = !(person.isFavorite ?? false);
      await updateDoc(doc(db, 'persons', personId), { isFavorite: updatedValue });
    } catch (error) { console.error(error); }
  };

  const editPerson = async (updatedPerson: Person) => {
    try {
      await updateDoc(doc(db, 'persons', updatedPerson.id), { 
        name: updatedPerson.name,
        guardianName: updatedPerson.guardianName,
        guardianPhone: updatedPerson.guardianPhone,
        allowCredit: updatedPerson.allowCredit !== undefined ? updatedPerson.allowCredit : true,
        paymentType: updatedPerson.paymentType || 'weekly'
      });
    } catch (error) { throw error; }
  };

  const deletePerson = async (id: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'persons', id));
      await batch.commit();
    } catch (error) {
      console.error('Error al eliminar:', error);
      Alert.alert('Error', 'No se pudo eliminar.');
      throw error;
    }
  };

  const getPersonTransactions = async (personId: string) => {
     try {
      // 1. Pedimos TODO sin importar la fecha
      const purchasesQ = query(collection(db, 'purchases'), where('personId', '==', personId));
      const paymentsQ = query(collection(db, 'payments'), where('personId', '==', personId));
      
      const [pSnap, paySnap] = await Promise.all([getDocs(purchasesQ), getDocs(paymentsQ)]);
      
      const purchases = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase));
      const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
      
      // 2. Ordenamos del más nuevo al más viejo
      purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // 3. Devolvemos TODO el historial completo a la pantalla
      return { purchases, payments };
    } catch (e) { 
      console.error("Error trayendo historial completo:", e);
      return { purchases: [], payments: [] }; 
    }
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
        getTransactionsByDateRange, recalculatePersonBalance, syncAllBalances, loadingMore: false, hasMore: false
      }}>
      {children}
    </DataContext.Provider>
  );
};