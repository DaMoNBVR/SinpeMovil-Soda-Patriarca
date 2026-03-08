import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, Linking, ScrollView, TouchableOpacity } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import uuid from 'react-native-uuid';

import { DataContext } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/StackNavigator';
import { Payment } from '../models';
import { useTheme } from '../context/ThemeContext';
import { commonStyles } from '../Styles/commonStyles';
import { getLocalDate, groupEventsByWeek } from '../utils/dateUtils';
import { sharePDFForPerson } from '../utils/pdfGenerator';
import { getLocalDateString } from '../utils/dateUtils';

function getWeekRangeLabel(startDate: Date): string {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return `Semana del ${startDate.toLocaleDateString('es-CR')} al ${endDate.toLocaleDateString('es-CR')}`;
}

function getPaymentDescription(type: string, comment?: string): string {
  switch (type) {
    case 'debtPayment':
      return 'Pago de deuda';
    case 'manualAdjustment':
      return `Ajuste manual${comment ? ` (${comment})` : ''}`;
    case 'prepaid':
      return 'Pago adelantado';
    default:
      return type;
  }
}

export default function PersonDetailScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'PersonDetail'>>();
  const { personId } = params;
  const { theme } = useTheme();
  const { role } = useAuth();
  const styles = createStyles(theme);

  const context = useContext(DataContext);
  if (!context) return <Text>Error: contexto no disponible</Text>;

  // AÑADIDO: recalculatePersonBalance
  const { persons, addPayment, updatePrepaidAmount, getPersonTransactions, recalculatePersonBalance } = context;
  
  // LIVE DATA: Buscamos a la persona directo del estado para ver cambios instantáneos
  const person = persons.find((p) => p.id === personId);

  const [purchases, setPurchases] = useState<any[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // 👉 NUEVO: Estado para el "Freno de mano"
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 👉 NUEVO: Separamos la función para poder llamarla al terminar un pago
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await getPersonTransactions(personId);
      setPurchases(history.purchases);
      setPayments(history.payments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  React.useEffect(() => {
    fetchHistory();
  }, [personId]);

  if (!person) return <Text>Persona no encontrada</Text>;

  const todayStr = getLocalDateString(new Date());

  const personPurchases = purchases;
  const personPayments = payments;

  const groupedPurchases = groupEventsByWeek(personPurchases);
  const groupedPayments = groupEventsByWeek(personPayments);

  const allWeekGroups = Array.from(
    new Map([...groupedPurchases, ...groupedPayments].map((g) => [g.key, g])).values()
  ).sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

  const [selectedWeekKey, setSelectedWeekKey] = useState<string>('general');

  const currentWeekPurchases =
    selectedWeekKey === 'general'
      ? personPurchases
      : groupedPurchases.find((g) => g.key === selectedWeekKey)?.events || [];

  const currentWeekPayments =
    selectedWeekKey === 'general'
      ? personPayments
      : groupedPayments.find((g) => g.key === selectedWeekKey)?.events || [];

  const sortedEvents = [...personPurchases, ...personPayments].sort(
    (a, b) => getLocalDate(a.date).getTime() - getLocalDate(b.date).getTime()
  );

  const group = groupedPurchases.find((g) => g.key === selectedWeekKey);
  const startDate = group?.startDate;
  const endDate = startDate ? new Date(startDate.getTime() + 6 * 86400000) : undefined;

  let saldoInicial = 0;
  let saldoSemana = 0;
  let pagosPosteriores = 0;
  let deudaSemana = 0;
  let pagosDesdeSemana = 0;

  for (const event of sortedEvents) {
    const fecha = getLocalDate(event.date);
    const esPago = (event as Payment).type !== undefined;
    const monto = esPago ? (event as Payment).amount : -event.amount;

    if (selectedWeekKey === 'general') {
      saldoSemana += monto;
    } else {
      if (startDate && fecha < startDate) {
        saldoInicial += monto;
      } else if (startDate && endDate && fecha >= startDate && fecha <= endDate) {
        saldoSemana += monto;
        deudaSemana += monto;
        if (esPago) pagosDesdeSemana += monto;
      } else if (startDate && endDate && fecha > endDate && esPago) {
        pagosDesdeSemana += monto;
      }
    }
  }

  const saldoFinal = selectedWeekKey === 'general' ? saldoSemana : saldoInicial + saldoSemana;

  let mostrarBotonPago = false;
  let mensajeDeudaCubierta = '';

  if (selectedWeekKey === 'general') {
    mostrarBotonPago = saldoSemana < 0;
  } else if (saldoSemana < 0) {
    if (pagosDesdeSemana >= -saldoSemana) {
      mensajeDeudaCubierta = '✅ Esta deuda fue saldada completamente.';
    } else if (pagosDesdeSemana > 0) {
      mensajeDeudaCubierta = '⚠️ Esta deuda fue pagada parcialmente.';
    }
  }

  // 👉 ACTUALIZADO: Manejo seguro del pago con bloqueo y recarga
  const handlePayDebt = () => {
    if (isSubmitting) return; // Freno de mano: Evita doble clic

    Alert.alert('Confirmar pago de deuda', '¿Está seguro de que desea registrar este pago?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setIsSubmitting(true); // Bloqueamos el botón
          const deuda = selectedWeekKey === 'general' ? -saldoSemana : -saldoSemana - pagosPosteriores;
          const newPayment: Payment = {
            id: uuid.v4() as string,
            personId: person.id,
            amount: deuda,
            date: todayStr,
            type: 'debtPayment',
          };
          try {
            await addPayment(newPayment);
            await updatePrepaidAmount(person.id, deuda);
            await fetchHistory(); // 🔄 OBLIGA a la pantalla a recargar y recalcular saldos
            Alert.alert('Éxito', 'La deuda ha sido pagada');
          } catch (error) {
            console.error('Error al registrar pago de deuda:', error);
            // La alerta de error ya se maneja en el DataContext, por lo que aquí no es estrictamente necesario otra
          } finally {
            setIsSubmitting(false); // Liberamos el botón siempre, incluso si falla
          }
        },
      },
    ]);
  };

  const handleExportPDF = () => {
    const selectedWeekStartDate =
      selectedWeekKey === 'general'
        ? undefined
        : groupedPurchases.find((g) => g.key === selectedWeekKey)?.startDate;
    sharePDFForPerson(person, currentWeekPurchases, currentWeekPayments, selectedWeekStartDate);
  };

  const handleWhatsApp = () => {
    if (!person.guardianPhone) {
      Alert.alert('No disponible', 'Esta persona no tiene número registrado.');
      return;
    }
    const normalizedPhone = person.guardianPhone.startsWith('+')
      ? person.guardianPhone
      : '+506' + person.guardianPhone.replace(/\D/g, '');

    const mensaje = person.guardianName
      ? `Hola ${person.guardianName},\n\nResumen de ${person.name}:\nSaldo: ${saldoFinal < 0 ? 'Deuda' : 'Saldo a favor'} de ₡${Math.abs(saldoFinal).toFixed(2)}.`
      : `Hola ${person.name},\n\nSaldo: ${saldoFinal < 0 ? 'Deuda' : 'Saldo a favor'} de ₡${Math.abs(saldoFinal).toFixed(2)}.`;

    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(mensaje)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp.'));
  };

  // Ordenar por fecha antes de mostrar
  const sortedPurchases = [...currentWeekPurchases].sort(
    (a, b) => getLocalDate(a.date).getTime() - getLocalDate(b.date).getTime()
  );

  const sortedPayments = [...currentWeekPayments].sort(
    (a, b) => getLocalDate(a.date).getTime() - getLocalDate(b.date).getTime()
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{person.name}</Text>
      {person.guardianName && <Text style={styles.subinfo}>Encargado: {person.guardianName}</Text>}
      {person.guardianPhone && <Text style={styles.subinfo}>📞 {person.guardianPhone}</Text>}

      <Picker selectedValue={selectedWeekKey} onValueChange={setSelectedWeekKey}>
        <Picker.Item label="Historial general" value="general" />
        {allWeekGroups.map((g) => (
          <Picker.Item key={g.key} label={getWeekRangeLabel(g.startDate)} value={g.key} />
        ))}
      </Picker>

      {selectedWeekKey !== 'general' && (
        <>
          <Text style={styles.section}>Saldo inicial de esta semana: ₡{saldoInicial.toFixed(2)}</Text>
          <Text style={[styles.section, { color: saldoFinal < 0 ? 'red' : 'green' }]}>Saldo final de esta semana: {saldoFinal < 0 ? 'Deuda' : 'Saldo a favor'} de ₡{Math.abs(saldoFinal).toFixed(2)}</Text>
        </>
      )}
      {selectedWeekKey === 'general' && (
        <>
          <Text style={[styles.section, { color: saldoFinal < 0 ? 'red' : 'green' }]}>Saldo final acumulado: {saldoFinal < 0 ? 'Deuda' : 'Saldo a favor'} de ₡{Math.abs(saldoFinal).toFixed(2)}</Text>
        </>
      )}

      {/* BOTÓN DE SINCRONIZACIÓN DE EMERGENCIA */}
      {role === 'admin' && (
        <TouchableOpacity 
            style={{
                marginTop: 10, 
                padding: 8, 
                backgroundColor: '#6c757d', 
                borderRadius: 5,
                alignItems: 'center'
            }}
            onPress={() => recalculatePersonBalance(person.id)}
        >
            <Text style={{color: '#fff', fontWeight: 'bold'}}>🔄 Sincronizar Saldo (Reparar)</Text>
        </TouchableOpacity>
      )}

      {mensajeDeudaCubierta !== '' && (
        <Text style={[styles.section, { color: 'orange' }]}>{mensajeDeudaCubierta}</Text>
      )}
      
      {/* 👉 ACTUALIZADO: Botón con estado visual de carga */}
      {mostrarBotonPago && (
        <Button 
          title={isSubmitting ? "Procesando pago..." : "Pagar deuda"} 
          color={isSubmitting ? "#888888" : "#f05454"} 
          disabled={isSubmitting}
          onPress={handlePayDebt} 
        />
      )}

      {role === 'admin' && (
        <>
          <View style={{ marginVertical: 10 }} />
          <Button
            title="Ajuste Manual (Admin)"
            color="#FFA500"
            onPress={() => navigation.navigate('ManualAdjustment', { personId: person.id })}
          />
        </>
      )}

      <View style={{ marginVertical: 10 }} />
      <Button title="Exportar PDF" onPress={handleExportPDF} />
      <View style={{ marginVertical: 10 }} />
      {person.guardianPhone && <Button title="Enviar por WhatsApp" color="#25D366" onPress={handleWhatsApp} />}

      <Text style={styles.section}>Compras:</Text>
      {sortedPurchases.map((item) => (
        <Text style={styles.item} key={item.id}>
          📅 {getLocalDate(item.date).toLocaleDateString('es-CR')} | ₡{item.amount} - {item.description || 'Sin descripción'}
        </Text>
      ))}

      <Text style={styles.section}>Pagos y ajustes:</Text>
      {sortedPayments.map((item) => (
        <Text style={styles.item} key={item.id}>
          📅 {getLocalDate(item.date).toLocaleDateString('es-CR')} | ₡{item.amount} - {getPaymentDescription(item.type, item.comment)}
        </Text>
      ))}
    </ScrollView>
  );
}

function createStyles(theme: 'light' | 'dark') {
  const isDark = theme === 'dark';
  return StyleSheet.create({
    container: { padding: 16, backgroundColor: isDark ? '#111' : '#fff' },
    title: { fontSize: 30, fontWeight: 'bold', marginBottom: 4, color: isDark ? '#fff' : '#000' },
    subtitle: { fontSize: 22, marginBottom: 12 },
    subinfo: { fontSize: 18, color: isDark ? '#bbb' : '#666' },
    section: { fontSize: 20, fontWeight: '600', marginTop: 20, marginBottom: 8, color: isDark ? '#fff' : '#000' },
    item: { fontSize: 20, fontWeight: '600', paddingVertical: 4, color: isDark ? '#ddd' : '#000' },
  });
}