import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Linking, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import uuid from 'react-native-uuid';

import { DataContext } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/StackNavigator';
import { Payment } from '../models';
import { useTheme } from '../context/ThemeContext';
import { getLocalDate, groupEventsByWeek, getLocalDateString } from '../utils/dateUtils';
import { sharePDFForPerson } from '../utils/pdfGenerator';

function getWeekRangeLabel(startDate: Date): string {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return `Semana del ${startDate.toLocaleDateString('es-CR')} al ${endDate.toLocaleDateString('es-CR')}`;
}

function getPaymentDescription(type: string, comment?: string): string {
  switch (type) {
    case 'debtPayment': return 'Pago de deuda';
    case 'manualAdjustment': return `Ajuste manual${comment ? ` (${comment})` : ''}`;
    case 'prepaid': return 'Pago adelantado';
    default: return type;
  }
}

export default function PersonDetailScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'PersonDetail'>>();
  const { personId } = params;
  const { theme } = useTheme();
  const { role } = useAuth();
  const isDark = theme === 'dark';
  const styles = createStyles(theme);

  const context = useContext(DataContext);
  if (!context) return <Text>Error: contexto no disponible</Text>;

  const { persons, addPayment, updatePrepaidAmount, getPersonTransactions, recalculatePersonBalance } = context;
  const person = persons.find((p) => p.id === personId);

  const [purchases, setPurchases] = useState<any[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Iniciamos en "recent" (Últimos 15 días)
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>('recent');

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      // Pedimos TODO el historial al context (Asegúrate de haber actualizado el DataContext.tsx también)
      const history = await getPersonTransactions(personId); 
      setPurchases(history.purchases);
      setPayments(history.payments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [personId]);

  if (!person) return <Text>Persona no encontrada</Text>;

  const todayStr = getLocalDateString(new Date());

  // Agrupamos para tener las opciones del menú
  const groupedPurchases = groupEventsByWeek(purchases);
  const groupedPayments = groupEventsByWeek(payments);
  const allWeekGroups = Array.from(
    new Map([...groupedPurchases, ...groupedPayments].map((g) => [g.key, g])).values()
  ).sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

  // Lógica para filtrar visualmente los últimos 15 días
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - 15);
  limitDate.setHours(0, 0, 0, 0);

  // FILTRAMOS LO QUE SE VA A MOSTRAR EN PANTALLA
  let visiblePurchases = [];
  let visiblePayments = [];

  if (selectedWeekKey === 'recent') {
    visiblePurchases = purchases.filter(p => getLocalDate(p.date) >= limitDate);
    visiblePayments = payments.filter(p => getLocalDate(p.date) >= limitDate);
  } else if (selectedWeekKey === 'all') {
    visiblePurchases = purchases;
    visiblePayments = payments;
  } else {
    visiblePurchases = groupedPurchases.find((g) => g.key === selectedWeekKey)?.events || [];
    visiblePayments = groupedPayments.find((g) => g.key === selectedWeekKey)?.events || [];
  }

  // CÁLCULO DE SALDOS EXACTOS
  const sortedEvents = [...purchases, ...payments].sort(
    (a, b) => getLocalDate(a.date).getTime() - getLocalDate(b.date).getTime()
  );

  const group = groupedPurchases.find((g) => g.key === selectedWeekKey);
  const startDate = group?.startDate;
  const endDate = startDate ? new Date(startDate.getTime() + 6 * 86400000) : undefined;

  let saldoInicial = 0;
  let saldoPeriodo = 0;

  for (const event of sortedEvents) {
    const fecha = getLocalDate(event.date);
    const esPago = (event as Payment).type !== undefined;
    const monto = esPago ? (event as Payment).amount : -event.amount;

    if (selectedWeekKey === 'all') {
      saldoPeriodo += monto;
    } else if (selectedWeekKey === 'recent') {
      if (fecha < limitDate) saldoInicial += monto;
      else saldoPeriodo += monto;
    } else {
      if (startDate && fecha < startDate) saldoInicial += monto;
      else if (startDate && endDate && fecha >= startDate && fecha <= endDate) saldoPeriodo += monto;
    }
  }

  // Saldo real total siempre es el de Firebase
  const saldoFinalReal = person.currentBalance || 0;
  // El saldo visual de lo que pasó en la pantalla (solo para semanas específicas)
  const saldoVisualFinalPeriodo = saldoInicial + saldoPeriodo;

  // Botón de pagar solo sale en 'recent' o 'all' (para evitar pagos parciales raros)
  const mostrarBotonPago = (selectedWeekKey === 'recent' || selectedWeekKey === 'all') && saldoFinalReal < 0;

  const handlePayDebt = () => {
    if (isSubmitting) return;

    Alert.alert('Abonar a cuenta', `El saldo deudor TOTAL es ₡${Math.abs(saldoFinalReal)}.\n¿Registrar pago por la totalidad?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setIsSubmitting(true);
          const deuda = Math.abs(saldoFinalReal);
          
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
            await fetchHistory();
            Alert.alert('Éxito', 'La deuda total ha sido pagada');
          } catch (error) {
            console.error('Error al registrar pago:', error);
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  const handleExportPDF = () => {
    let pdfTitleDate: Date | undefined = undefined;
    let saldoParaPDF = saldoFinalReal; // Por defecto enviamos el saldo total actual
    
    // Si NO es "recent" y NO es "all", significa que es una semana específica
    if (selectedWeekKey !== 'recent' && selectedWeekKey !== 'all') {
      pdfTitleDate = startDate;
      saldoParaPDF = saldoVisualFinalPeriodo;
    }
    
    sharePDFForPerson(person, visiblePurchases, visiblePayments, pdfTitleDate, saldoParaPDF);
  };

  const handleWhatsApp = () => {
    if (!person.guardianPhone) {
      Alert.alert('No disponible', 'Esta persona no tiene número registrado.');
      return;
    }
    const normalizedPhone = person.guardianPhone.startsWith('+')
      ? person.guardianPhone
      : '+506' + person.guardianPhone.replace(/\D/g, '');

    const mensaje = `Hola${person.guardianName ? ' ' + person.guardianName : ''},\n\nResumen de la cuenta de ${person.name}:\nSaldo actual: ${saldoFinalReal < 0 ? 'Deuda' : 'Saldo a favor'} de ₡${Math.abs(saldoFinalReal).toFixed(2)}.`;

    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(mensaje)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp.'));
  };

  const sortedPurchases = [...visiblePurchases].sort((a, b) => getLocalDate(b.date).getTime() - getLocalDate(a.date).getTime());
  const sortedPayments = [...visiblePayments].sort((a, b) => getLocalDate(b.date).getTime() - getLocalDate(a.date).getTime());

  const pickerTextColor = isDark ? '#ffffff' : '#000000';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{person.name}</Text>
      {person.guardianName && <Text style={styles.subinfo}>Encargado: {person.guardianName}</Text>}
      {person.guardianPhone && <Text style={styles.subinfo}>📞 {person.guardianPhone}</Text>}

      <View style={{ 
          borderWidth: 1, 
          borderColor: isDark ? '#444' : '#ccc', 
          borderRadius: 8, 
          marginTop: 15,
          marginBottom: 10,
          backgroundColor: isDark ? '#222' : '#f9f9f9'
      }}>
        <Picker 
            selectedValue={selectedWeekKey} 
            onValueChange={setSelectedWeekKey} 
            style={{ color: pickerTextColor }} 
            dropdownIconColor={pickerTextColor} 
            itemStyle={{ color: pickerTextColor, fontSize: 16 }} 
        >
          <Picker.Item label="Últimos 15 días (Reciente)" value="recent" color={pickerTextColor} />
          <Picker.Item label="Historial Completo (Todo)" value="all" color={pickerTextColor} />
          {allWeekGroups.map((g) => (
            <Picker.Item key={g.key} label={getWeekRangeLabel(g.startDate)} value={g.key} color={pickerTextColor} />
          ))}
        </Picker>
      </View>

      {/* 🚀 MOSTRAR SALDOS SEGÚN LA VISTA (SOLUCIÓN AL DUPLICADO) */}
      
      {selectedWeekKey === 'recent' && (
        <View style={{ marginBottom: 10 }}>
          {/* 👇 Si hay saldo viejo de hace meses, lo ponemos pequeñito como nota */}
          {saldoInicial !== 0 && (
            <Text style={[styles.section, { fontSize: 16, color: isDark ? '#aaa' : '#666', marginBottom: 5 }]}>
              (Incluye saldo arrastrado anterior a este periodo: ₡{saldoInicial.toFixed(2)})
            </Text>
          )}
          {/* 👇 El saldo principal es el TOTAL REAL GRANDE */}
          <Text style={[styles.section, { color: saldoFinalReal < 0 ? '#ff6b6b' : '#4caf50', fontSize: 24 }]}>
            Saldo Actual Total: {saldoFinalReal < 0 ? 'Deuda' : 'Saldo a favor'} de ₡{Math.abs(saldoFinalReal).toFixed(2)}
          </Text>
        </View>
      )}

      {selectedWeekKey === 'all' && (
        <View style={{ marginBottom: 10 }}>
          <Text style={[styles.section, { color: saldoFinalReal < 0 ? '#ff6b6b' : '#4caf50', fontSize: 24 }]}>
            Saldo Total: {saldoFinalReal < 0 ? 'Deuda' : 'Saldo a favor'} de ₡{Math.abs(saldoFinalReal).toFixed(2)}
          </Text>
        </View>
      )}

      {selectedWeekKey !== 'recent' && selectedWeekKey !== 'all' && (
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.section}>Saldo al iniciar esta semana: ₡{saldoInicial.toFixed(2)}</Text>
          <Text style={[styles.section, { color: saldoVisualFinalPeriodo < 0 ? '#ff6b6b' : '#4caf50', fontSize: 20 }]}>
            Saldo al finalizar la semana: {saldoVisualFinalPeriodo < 0 ? 'Deuda' : 'A favor'} de ₡{Math.abs(saldoVisualFinalPeriodo).toFixed(2)}
          </Text>
        </View>
      )}

      <View style={{ marginTop: 10 }}>
        {role === 'admin' && (
          <View style={{ marginBottom: 15 }}>
            <TouchableOpacity 
                style={{ padding: 12, backgroundColor: '#6c757d', borderRadius: 8, alignItems: 'center' }}
                onPress={() => recalculatePersonBalance(person.id)}
            >
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>🔄 Sincronizar Saldo</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {mostrarBotonPago && (
          <View style={{ marginBottom: 15 }}>
            <TouchableOpacity 
                style={{ padding: 12, backgroundColor: isSubmitting ? "#888888" : "#f05454", borderRadius: 8, alignItems: 'center' }}
                disabled={isSubmitting}
                onPress={handlePayDebt}
            >
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>
                  {isSubmitting ? "Procesando pago..." : "💰 Abonar deuda total"}
                </Text>
            </TouchableOpacity>
          </View>
        )}

        {role === 'admin' && (
          <View style={{ marginBottom: 15 }}>
            <TouchableOpacity 
                style={{ padding: 12, backgroundColor: '#FFA500', borderRadius: 8, alignItems: 'center' }}
                onPress={() => navigation.navigate('ManualAdjustment', { personId: person.id })}
            >
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>⚙️ Ajuste Manual (Admin)</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ marginBottom: 15 }}>
          <TouchableOpacity 
              style={{ padding: 12, backgroundColor: '#007bff', borderRadius: 8, alignItems: 'center' }}
              onPress={handleExportPDF}
          >
              <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>📄 Exportar reporte a PDF</Text>
          </TouchableOpacity>
        </View>

        {person.guardianPhone && (
          <View style={{ marginBottom: 15 }}>
            <TouchableOpacity 
                style={{ padding: 12, backgroundColor: '#25D366', borderRadius: 8, alignItems: 'center' }}
                onPress={handleWhatsApp}
            >
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>💬 Enviar por WhatsApp</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.section}>Compras mostradas:</Text>
      {loadingHistory ? (
        <ActivityIndicator size="small" color="#007bff" style={{marginTop: 10, alignSelf: 'flex-start'}}/>
      ) : sortedPurchases.length === 0 ? (
        <Text style={{color: '#888', fontStyle: 'italic'}}>No hay compras registradas en este periodo.</Text>
      ) : (
        sortedPurchases.map((item) => (
          <Text style={styles.item} key={item.id}>
            📅 {getLocalDate(item.date).toLocaleDateString('es-CR')} | ₡{item.amount.toFixed(2)} - {item.description || 'Sin descripción'}
          </Text>
        ))
      )}

      <Text style={styles.section}>Pagos y ajustes mostrados:</Text>
      {loadingHistory ? (
        <ActivityIndicator size="small" color="#007bff" style={{marginTop: 10, alignSelf: 'flex-start'}}/>
      ) : sortedPayments.length === 0 ? (
        <Text style={{color: '#888', fontStyle: 'italic'}}>No hay pagos registrados en este periodo.</Text>
      ) : (
        sortedPayments.map((item) => (
          <Text style={styles.item} key={item.id}>
            📅 {getLocalDate(item.date).toLocaleDateString('es-CR')} | ₡{item.amount.toFixed(2)} - {getPaymentDescription(item.type, item.comment)}
          </Text>
        ))
      )}
      
      <View style={{height: 40}}/>
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
    item: { fontSize: 16, fontWeight: '500', paddingVertical: 4, color: isDark ? '#ddd' : '#333' },
  });
}