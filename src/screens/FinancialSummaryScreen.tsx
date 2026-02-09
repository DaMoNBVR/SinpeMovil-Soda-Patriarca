import React, { useContext, useState, useEffect } from 'react';
import { View, Text, Button, Platform, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DataContext } from '../context/DataContext';
import { getSummaryByPerson } from '../utils/summaryHelpers';
import { useTheme } from '../context/ThemeContext';
import { generatePDFReport } from '../utils/pdfGenerator';
import { getLocalDateString } from '../utils/dateUtils';
import { commonStyles } from '../Styles/commonStyles';
import { Purchase, Payment, Person } from '../models';

type TabMode = 'daily' | 'weekly';

export default function FinancialSummaryScreen({ route }: any) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const styles = getStyles(isDark);

    const context = useContext(DataContext);

    // Initial mode from route params or default to daily
    const initialMode = route.params?.mode || 'daily';
    const [mode, setMode] = useState<TabMode>(initialMode);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);

    if (!context) return <Text>Error: DataContext no disponible</Text>;
    const { persons, getTransactionsByDateRange } = context;

    useEffect(() => {
        fetchData();
    }, [mode, selectedDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let startStr = '';
            let endStr = '';

            if (mode === 'daily') {
                const dateStr = getLocalDateString(selectedDate);
                startStr = dateStr;
                endStr = dateStr;
            } else {
                const { start, end } = getWeekRange(selectedDate);
                startStr = getLocalDateString(start);
                endStr = getLocalDateString(end);
            }

            const data = await getTransactionsByDateRange(startStr, endStr);
            setPurchases(data.purchases);
            setPayments(data.payments);
        } catch (error) {
            console.error("Error fetching summary data", error);
            Alert.alert('Error', 'No se pudieron cargar los datos del resumen.');
        } finally {
            setLoading(false);
        }
    };

    const getWeekRange = (date: Date) => {
        const day = date.getDay();
        // Adjust logic to make Monday the start of week if needed? undefined standard uses Sunday-Saturday.
        // Let's assume user wants standard Sunday-Saturday or Monday-Sunday? 
        // Previous code used `date.getDate() - day`. If day is 0 (Sunday), starts on Sunday.
        const start = new Date(date);
        start.setDate(date.getDate() - day); // Start of week (Sunday)
        const end = new Date(start);
        end.setDate(start.getDate() + 6); // End of week (Saturday)
        return { start, end };
    };

    const handleDateChange = (event: any, date?: Date) => {
        setShowPicker(false);
        if (date) setSelectedDate(date);
    };

    const formatDateLabel = (date: Date) => {
        return date.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const getRangeLabel = () => {
        if (mode === 'daily') return formatDateLabel(selectedDate);
        const { start, end } = getWeekRange(selectedDate);
        return `Del ${formatDateLabel(start)} al ${formatDateLabel(end)}`;
    };

    const purchaseSummary = getSummaryByPerson(purchases, persons);
    const paymentSummary = getSummaryByPerson(payments, persons);

    const balanceSummary = persons.map((person) => {
        const totalPurchases = purchaseSummary.find(p => p.personId === person.id)?.total || 0;
        const totalPayments = paymentSummary.find(p => p.personId === person.id)?.total || 0;
        return {
            personId: person.id,
            name: person.name,
            balance: totalPayments - totalPurchases,
        };
    }).filter(item => item.balance !== 0);

    const handleExportPDF = () => {
        const rangeLabel = getRangeLabel();
        const title = `Resumen ${mode === 'daily' ? 'Diario' : 'Semanal'} – ${rangeLabel}`;

        const comprasRows = purchaseSummary.length
            ? purchaseSummary.map(item =>
                `<div class="item">${item.name}: ₡${item.total.toFixed(2)}</div>`
            ).join('')
            : '<div class="item">No hay compras este período.</div>';

        const pagosRows = paymentSummary.length
            ? paymentSummary.map(item =>
                `<div class="item">${item.name}: ₡${item.total.toFixed(2)}</div>`
            ).join('')
            : '<div class="item">No hay pagos este período.</div>';

        const balanceRows = balanceSummary.length
            ? balanceSummary.map(item => {
                const color = item.balance < 0 ? 'red' : 'green';
                const label = item.balance < 0 ? 'Deuda' : 'Saldo';
                return `<div class="item" style="color:${color};">${item.name}: ${label} ₡${Math.abs(item.balance).toFixed(2)}</div>`;
            }).join('')
            : '<div class="item">No hay movimientos que generen balance.</div>';

        const content = `
        <h2>Compras</h2>${comprasRows}
        <h2>Pagos</h2>${pagosRows}
        <h2>Balance del período</h2>${balanceRows}
      `;

        generatePDFReport(title, content);
    };

    return (
        <View style={styles.container}>
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, mode === 'daily' && styles.activeTab]}
                    onPress={() => setMode('daily')}>
                    <Text style={[styles.tabText, mode === 'daily' && styles.activeTabText]}>Diario</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, mode === 'weekly' && styles.activeTab]}
                    onPress={() => setMode('weekly')}>
                    <Text style={[styles.tabText, mode === 'weekly' && styles.activeTabText]}>Semanal</Text>
                </TouchableOpacity>
            </View>

            <Text style={[styles.subtitle, { color: isDark ? '#ccc' : '#555', textAlign: 'center' }]}>
                {getRangeLabel()}
            </Text>

            <View style={styles.controls}>
                <Button title="Cambiar Fecha" onPress={() => setShowPicker(true)} />
                <View style={{ width: 10 }} />
                <Button title="Exportar PDF" onPress={handleExportPDF} />
            </View>

            {showPicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                />
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
            ) : (
                <ScrollView style={{ flex: 1 }}>
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>Compras</Text>
                        {purchaseSummary.length === 0 ? (
                            <Text style={[commonStyles.itemText, { color: isDark ? '#aaa' : '#666' }]}>No hay compras.</Text>
                        ) : (
                            purchaseSummary.map(item => (
                                <Text key={item.personId} style={[commonStyles.itemText, { color: isDark ? '#fff' : '#000' }]}>
                                    {item.name}: ₡{item.total.toFixed(2)}
                                </Text>
                            ))
                        )}
                    </View>

                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>Pagos</Text>
                        {paymentSummary.length === 0 ? (
                            <Text style={[commonStyles.itemText, { color: isDark ? '#aaa' : '#666' }]}>No hay pagos.</Text>
                        ) : (
                            paymentSummary.map(item => (
                                <Text key={item.personId} style={[commonStyles.itemText, { color: 'green' }]}>
                                    {item.name}: ₡{item.total.toFixed(2)}
                                </Text>
                            ))
                        )}
                    </View>

                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>Balance del Período</Text>
                        {balanceSummary.length === 0 ? (
                            <Text style={[commonStyles.itemText, { color: isDark ? '#aaa' : '#666' }]}>Sin cambios en balance.</Text>
                        ) : (
                            balanceSummary.map(item => (
                                <Text key={item.personId} style={[commonStyles.itemText, { color: item.balance < 0 ? 'red' : 'green' }]}>
                                    {item.name}: {item.balance < 0 ? 'Deuda' : 'Saldo'} ₡{Math.abs(item.balance).toFixed(2)}
                                </Text>
                            ))
                        )}
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: isDark ? '#121212' : '#fff' },
    tabContainer: { flexDirection: 'row', marginBottom: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? '#444' : '#ccc' },
    tab: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: isDark ? '#222' : '#f0f0f0' },
    activeTab: { backgroundColor: isDark ? '#444' : '#007bff' },
    tabText: { fontSize: 16, color: isDark ? '#fff' : '#333' },
    activeTabText: { color: '#fff', fontWeight: 'bold' },
    subtitle: { fontSize: 18, marginBottom: 16 },
    controls: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
    sectionContainer: { marginBottom: 20 },
    sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 4 },
});
