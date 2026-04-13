import React, { useContext, useState, useEffect, useMemo } from 'react';
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

// 🛡️ FUNCIÓN DE APOYO PARA MANEJAR FECHAS NUEVAS Y VIEJAS
const parseSafeDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  // Si tiene una 'T', es el formato nuevo con hora que hicimos hoy
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  // Si no tiene 'T', es el formato viejo (YYYY-MM-DD), usamos la utilidad del proyecto
  return getLocalDate(dateStr);
};

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
  
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>('recent');

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

  useEffect(() => {
    fetchHistory();
  }, [personId]);

  if (!person) return <Text>Persona no encontrada</Text>;

  // Agrupamos para el Picker
  const groupedPurchases = groupEventsByWeek(purchases);
  const groupedPayments = groupEventsByWeek(payments);
  const allWeekGroups = Array.from(
    new Map([...groupedPurchases, ...groupedPayments].map((g) => [g.key, g])).values()
  ).sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

  // 🛡️ CÁLCULOS OPTIMIZADOS CON useMemo
  const { visiblePurchases, visiblePayments, saldoInicial, saldoPeriodo, startDate, endDate } = useMemo(() => {
    let vPurchases = [];
    let vPayments = [];
    
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 15);
    limitDate.setHours(0, 0, 0, 0);

    const group = allWeekGroups.find((g) => g.key === selectedWeekKey);
    const sDate = group?.startDate;
    const eDate = sDate ? new Date(sDate.getTime() + 6 * 86400000) : undefined;

    // Filtrado visual
    if (selectedWeekKey === 'recent') {
      vPurchases = purchases.filter(p => parseSafeDate(p.date) >= limitDate);
      vPayments = payments.filter(p => parseSafeDate(p.date) >= limitDate);
    } else if (selectedWeekKey === 'all') {
      vPurchases = purchases;
      vPayments = payments;
    } else {
      vPurchases = groupedPurchases.find((g) => g.key === selectedWeekKey)?.events || [];
      vPayments = groupedPayments.find((g) => g.key === selectedWeekKey)?.events || [];
    }

    // Cálculo de saldos usando parseSafeDate para no perder la hora en el ordenamiento
    const sorted = [...purchases, ...payments].sort(
      (a, b) => parseSafeDate(a.date).getTime() - parseSafeDate(b.date).getTime()
    );

    let sInicial = 0;
    let sPeriodo = 0;

    for (const event of sorted) {
      if (!event || !event.date) continue;
      const fecha = parseSafeDate(event.date);
      const esPago = (event as Payment).type !== undefined;
      const monto = esPago ? (event as Payment).amount : -event.amount;

      if (selectedWeekKey === 'all') {
        sPeriodo += monto;
      } else if (selectedWeekKey === 'recent') {
        if (fecha < limitDate) sInicial += monto;
        else sPeriodo += monto;
      } else {
        if (sDate && fecha < sDate) sInicial += monto;
        else if (sDate && eDate && fecha >= sDate && fecha <= eDate) sPeriodo += monto;
      }
    }

    return { 
      visiblePurchases: vPurchases, 
      visiblePayments: vPayments, 
      saldoInicial: sInicial, 
      saldoPeriodo: sPeriodo,
      startDate: sDate,
      endDate: eDate
    };
  }, [selectedWeekKey, purchases, payments]);

  const saldoFinalReal = person.currentBalance || 0;
  const saldoVisualFinalPeriodo = saldoInicial + saldoPeriodo;
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
          
          const now = new Date();
          const localISO = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, -1);

          const newPayment: Payment = {
            id: uuid.v4() as string,
            personId: person.id,
            amount: deuda,
            date: localISO,
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
    let saldoParaPDF = saldoFinalReal; 
    
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

    const mensaje = `Hola${person.guardianName ? ' ' + person.guardianName : ''},\n\nResumen de la cuenta de ${person.name}:\nSaldo al finalizar el periodo: ${saldoFinalReal < 0 ? 'Deuda' : 'Saldo a favor'} de ₡${Math.abs(saldoFinalReal).toFixed(2)}.`;

    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(mensaje)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp.'));
  };

  // 🛡️ ORDENAMIENTO POR TIEMPO REAL (RECIENTE ARRIBA)
  const sortedPurchases = [...visiblePurchases].sort((a, b) => parseSafeDate(b.date).getTime() - parseSafeDate(a.date).getTime());
  const sortedPayments = [...visiblePayments].sort((a, b) => parseSafeDate(b.date).getTime() - parseSafeDate(a.date).getTime());

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

      {selectedWeekKey === 'recent' && (
        <View style={{ marginBottom: 10 }}>
          {saldoInicial !== 0 && (
            <Text style={[styles.section, { fontSize: 16, color: isDark ? '#aaa' : '#666', marginBottom: 5 }]}>
              (Incluye saldo arrastrado anterior a este periodo: ₡{saldoInicial.toFixed(2)})
            </Text>
          )}
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
            Saldo al finalizar el periodo: {saldoVisualFinalPeriodo < 0 ? 'Deuda' : 'A favor'} de ₡{Math.abs(saldoVisualFinalPeriodo).toFixed(2)}
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
        sortedPurchases.map((item) => {
          const isNewFormat = item.date.includes('T');
          const dateObj = parseSafeDate(item.date);
          const fechaStr = dateObj.toLocaleDateString('es-CR');
          const horaStr = isNewFormat ? dateObj.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }) : '';
          
          return (
            <Text style={styles.item} key={item.id}>
              📅 {fechaStr} {horaStr ? `| 🕒 ${horaStr} ` : ''}| ₡{item.amount.toFixed(2)} - {item.description || 'Sin descripción'}
            </Text>
          );
        })
      )}

      <Text style={styles.section}>Pagos y ajustes mostrados:</Text>
      {loadingHistory ? (
        <ActivityIndicator size="small" color="#007bff" style={{marginTop: 10, alignSelf: 'flex-start'}}/>
      ) : sortedPayments.length === 0 ? (
        <Text style={{color: '#888', fontStyle: 'italic'}}>No hay pagos registrados en este periodo.</Text>
      ) : (
        sortedPayments.map((item) => {
          const isNewFormat = item.date.includes('T');
          const dateObj = parseSafeDate(item.date);
          const fechaStr = dateObj.toLocaleDateString('es-CR');
          const horaStr = isNewFormat ? dateObj.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }) : '';

          return (
            <Text style={styles.item} key={item.id}>
              📅 {fechaStr} {horaStr ? `| 🕒 ${horaStr} ` : ''}| ₡{item.amount.toFixed(2)} - {getPaymentDescription(item.type, item.comment)}
            </Text>
          );
        })
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