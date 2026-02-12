import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Alert } from 'react-native';

export const runBalanceMigration = async () => {
    try {
        console.log('Iniciando migración de balances...');
        const [personsSnap, purchasesSnap, paymentsSnap] = await Promise.all([
            getDocs(collection(db, 'persons')),
            getDocs(collection(db, 'purchases')),
            getDocs(collection(db, 'payments'))
        ]);

        const purchases = purchasesSnap.docs.map(d => d.data());
        const payments = paymentsSnap.docs.map(d => d.data());

        let batch = writeBatch(db);
        let count = 0;
        let totalUpdated = 0;

        for (const personDoc of personsSnap.docs) {
            const personId = personDoc.id;
            const personPurchases = purchases.filter((p: any) => p.personId === personId);
            const personPayments = payments.filter((p: any) => p.personId === personId);

            const totalPurchases = personPurchases.reduce((sum, p: any) => sum + (Number(p.amount) || 0), 0);
            const totalPayments = personPayments.reduce((sum, p: any) => sum + (Number(p.amount) || 0), 0);

            // Balance = Compras - Pagos
            // Si prepago se considera pago, reduce la deuda.
            const balance = totalPayments - totalPurchases;

            const ref = doc(db, 'persons', personId);
            batch.update(ref, { currentBalance: balance });
            count++;
            totalUpdated++;

            if (count >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }
        }

        if (count > 0) {
            await batch.commit();
        }

        console.log(`Migración finalizada. ${totalUpdated} personas actualizadas.`);
        Alert.alert('Migración Completada', `Se actualizaron ${totalUpdated} personas.`);
    } catch (error) {
        console.error('Migration error:', error);
        Alert.alert('Error', 'Falló la migración. Revisa la consola.');
    }
};
