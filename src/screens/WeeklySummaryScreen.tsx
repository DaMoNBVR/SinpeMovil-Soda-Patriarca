import React, { useContext, useState } from 'react';
import { View, Text, FlatList, Button, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DataContext } from '../context/DataContext';
import { getSummaryByPerson } from '../utils/summaryHelpers';
import { useTheme } from '../context/ThemeContext';
import { generatePDFReport } from '../utils/pdfGenerator';
import { getLocalDateString } from '../utils/dateUtils'; // ✅ Importado

const getISOWeek = (date: Date): number => {
  const tmpDate = new Date(date.getTime());
  tmpDate.setHours(0, 0, 0, 0);
  tmpDate.setDate(tmpDate.getDate() + 3 - ((tmpDate.getDay() + 6) % 7));
  const firstThursday = new Date(tmpDate.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((tmpDate.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7
    )
  );
};

const isSameWeek = (date1: Date, date2: Date) =>
  getISOWeek(date1) === getISOWeek(date2) && date1.getFullYear() === date2.getFullYear();

const getWeekRange = (date: Date) => {
  const day = date.getDay(); // Sunday = 0
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
};

const formatDate = (date: Date) =>
  date.toLocaleDateString('es-CR', { day: 'numeric', month: 'long' });

export default function WeeklySummaryScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const context = useContext(DataContext);
  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { purchases, payments, persons } = context;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const handleDateChange = (_: any, date?: Date) => {
    setShowPicker(false);
    if (date) setSelectedDate(date);
  };

  // ✅ Corrige la conversión de fechas a Date local
  const weekPurchases = purchases.filter((p) =>
    isSameWeek(new Date(p.date), selectedDate)
  );
  const weekPayments = payments.filter((p) =>
    isSameWeek(new Date(p.date), selectedDate)
  );

  const purchaseSummary = getSummaryByPerson(weekPurchases, persons);
  const paymentSummary = getSummaryByPerson(weekPayments, persons);

  const balanceSummary = persons.map((person) => {
    const totalPurchases = purchaseSummary.find(p => p.personId === person.id)?.total || 0;
    const totalPayments = paymentSummary.find(p => p.personId === person.id)?.total || 0;
    return {
      personId: person.id,
      name: person.name,
      balance: totalPayments - totalPurchases,
    };
  }).filter(item => item.balance !== 0);

  const { start, end } = getWeekRange(selectedDate);

  const handleExportPDF = async () => {
    const content = `
      <h2>Semana del ${formatDate(start)} al ${formatDate(end)}</h2>
      <h3>Compras:</h3>
      ${purchaseSummary.map((p) => `<div class="item">${p.name}: ₡${p.total.toFixed(2)}</div>`).join('')}
      <h3>Pagos:</h3>
      ${paymentSummary.map((p) => `<div class="item">${p.name}: ₡${p.total.toFixed(2)}</div>`).join('')}
      <h3>Balance semanal:</h3>
      ${balanceSummary.map((b) => `
        <div class="item" style="color: ${b.balance < 0 ? 'red' : 'green'}">
          ${b.name}: ${b.balance < 0 ? 'Deuda' : 'Saldo'} ₡${Math.abs(b.balance).toFixed(2)}
        </div>`).join('')}
    `;
    await generatePDFReport('Resumen Semanal', content);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
      <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Resumen Semanal</Text>
      <Text style={[styles.subtitle, { color: isDark ? '#ccc' : '#555' }]}>
        Semana del {formatDate(start)} al {formatDate(end)}
      </Text>

      <Button title="Cambiar semana" onPress={() => setShowPicker(true)} />
      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      <View style={{ marginVertical: 5 }}></View>
      <Button title="Exportar PDF" onPress={handleExportPDF} />

      <Text style={[styles.section, { color: isDark ? '#fff' : '#000' }]}>Compras de la semana:</Text>
      <FlatList
        data={purchaseSummary}
        keyExtractor={(item) => item.personId}
        renderItem={({ item }) => (
          <Text style={[styles.item, { color: isDark ? '#fff' : '#000' }]}>
            {item.name}: ₡{item.total.toFixed(2)}
          </Text>
        )}
        ListEmptyComponent={<Text style={{ color: isDark ? '#aaa' : '#333' }}>No hay compras esta semana.</Text>}
      />

      <Text style={[styles.section, { color: isDark ? '#fff' : '#000' }]}>Pagos de la semana:</Text>
      <FlatList
        data={paymentSummary}
        keyExtractor={(item) => item.personId}
        renderItem={({ item }) => (
          <Text style={[styles.paymentItem, { color: 'green' }]}>
            {item.name}: ₡{item.total.toFixed(2)}
          </Text>
        )}
        ListEmptyComponent={<Text style={{ color: isDark ? '#aaa' : '#333' }}>No hay pagos esta semana.</Text>}
      />

      <Text style={[styles.section, { color: isDark ? '#fff' : '#000' }]}>Balance semanal:</Text>
      <FlatList
        data={balanceSummary}
        keyExtractor={(item) => item.personId}
        renderItem={({ item }) => (
          <Text style={[
            styles.balanceItem,
            { color: item.balance < 0 ? 'red' : 'green' }
          ]}>
            {item.name}: {item.balance < 0 ? 'Deuda' : 'Saldo'} ₡{Math.abs(item.balance).toFixed(2)}
          </Text>
        )}
        ListEmptyComponent={
          <Text style={{ color: isDark ? '#aaa' : '#333' }}>No hay movimientos que generen balance.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 12 },
  section: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 6 },
  item: { fontSize: 16, marginVertical: 4 },
  paymentItem: { fontSize: 16, marginVertical: 4 },
  balanceItem: { fontSize: 16, marginVertical: 4 },
});
