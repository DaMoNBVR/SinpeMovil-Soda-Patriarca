import React, { useContext } from 'react';
import { View, Text, FlatList, StyleSheet, Button, Alert } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { DataContext } from '../context/DataContext';
import { RootStackParamList } from '../navigation/StackNavigator';
import uuid from 'react-native-uuid';
import { Payment } from '../models';
import { useTheme } from '../context/ThemeContext';
import { sharePDFForPerson } from '../utils/pdfGenerator';

type PersonDetailRouteProp = RouteProp<RootStackParamList, 'PersonDetail'>;

export default function PersonDetailScreen() {
  const { params } = useRoute<PersonDetailRouteProp>();
  const { personId } = params;
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const context = useContext(DataContext);
  if (!context) return <Text>Error: contexto no disponible</Text>;

  const { persons, purchases, payments, addPayment, updatePrepaidAmount } = context;
  const person = persons.find((p) => p.id === personId);
  if (!person) return <Text>Persona no encontrada</Text>;

  const todayStr = new Date().toISOString().split('T')[0];

  const personPurchases = purchases
    .filter((p) => p.personId === personId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const personPayments = payments
    .filter((p) => p.personId === personId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalPurchases = personPurchases.reduce((sum, p) => sum + p.amount, 0);
  const totalPayments = personPayments.reduce((sum, p) => sum + p.amount, 0);
  const saldo = totalPayments - totalPurchases;

  const traducirTipo = (type: string) => {
    switch (type) {
      case 'prepaid': return 'Pago adelantado';
      case 'debtPayment': return 'Pago de deuda';
      case 'manualAdjustment': return 'Ajuste manual';
      default: return 'Otro';
    }
  };

  const handlePayDebt = () => {
    const debt = -saldo;
    if (debt <= 0) return;

    const newPayment: Payment = {
      id: uuid.v4() as string,
      personId: person.id,
      amount: debt,
      date: todayStr,
      type: 'debtPayment',
    };

    addPayment(newPayment);
    updatePrepaidAmount(person.id, debt);
    Alert.alert('Éxito', 'La deuda ha sido pagada');
  };

  const handleExportPDF = () => {
    sharePDFForPerson(person, personPurchases, personPayments);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{person.name}</Text>
      <Text style={[styles.subtitle, { color: saldo < 0 ? 'red' : 'green' }]}>
        {saldo < 0 ? 'Deuda: ' : 'Saldo a favor: '}₡{Math.abs(saldo).toFixed(2)}
      </Text>

      {saldo < 0 && (
        <Button title="Pagar deuda" color="#f05454" onPress={handlePayDebt} />
      )}

      <View style={{ marginVertical: 10 }}></View>
      <Button title="Exportar historial en PDF" onPress={handleExportPDF} />

      <Text style={styles.section}>Compras:</Text>
      <FlatList
        data={personPurchases}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.item}>
            📅 {item.date} | ₡{item.amount} - {item.description || 'Sin descripción'}
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.item}>No hay compras registradas.</Text>}
      />

      <Text style={styles.section}>Pagos y ajustes:</Text>
      <FlatList
        data={personPayments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.item}>
            📅 {item.date} | ₡{item.amount} - {traducirTipo(item.type)}{item.comment ? ` (${item.comment})` : ''}
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.item}>No hay pagos ni ajustes.</Text>}
      />
    </View>
  );
}

function createStyles(theme: 'light' | 'dark') {
  const isDark = theme === 'dark';
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: isDark ? '#111' : '#fff',
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      marginBottom: 10,
      color: isDark ? '#fff' : '#000',
    },
    subtitle: {
      fontSize: 18,
      marginBottom: 16,
      color: isDark ? '#ccc' : '#333',
    },
    section: {
      fontSize: 20,
      fontWeight: '600',
      marginTop: 20,
      marginBottom: 8,
      color: isDark ? '#fff' : '#000',
    },
    item: {
      fontSize: 16,
      paddingVertical: 4,
      color: isDark ? '#ddd' : '#000',
    },
  });
}
