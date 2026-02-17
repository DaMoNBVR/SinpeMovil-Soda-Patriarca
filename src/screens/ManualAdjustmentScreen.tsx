import React, { useContext, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { DataContext } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/StackNavigator';
import { commonStyles } from '../Styles/commonStyles';
import uuid from 'react-native-uuid';
import { getLocalDateString } from '../utils/dateUtils';
import { Payment, Purchase } from '../models';

type AdjustmentMode = 'difference' | 'absolute';

export default function ManualAdjustmentScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ManualAdjustment'>>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const context = useContext(DataContext);
  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { persons, addPayment, addPurchase } = context;

  const params = route.params as any;
  const initialPersonId = params?.personId || ''; 

  // Estados
  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState(initialPersonId);
  
  // MODOS: 'difference' (Sumar/Restar) o 'absolute' (Fijar saldo final)
  const [mode, setMode] = useState<AdjustmentMode>('difference');
  
  const [amountInput, setAmountInput] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const selectedPerson = persons.find(p => p.id === selectedPersonId);

  const filteredResults = useMemo(() => {
    if (!search) return [];
    return persons
        .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 5);
  }, [persons, search]);

  const handleSelectPerson = (person: any) => {
    setSelectedPersonId(person.id);
    setSearch('');
    setInputFocused(false);
    setAmountInput('');
  };

  // Cálculos en tiempo real
  const currentBalance = selectedPerson?.currentBalance || 0;
  
  // Parseamos el input permitiendo negativos
  const inputValue = parseFloat(amountInput);
  const validAmount = !isNaN(inputValue);
  const safeInputValue = validAmount ? inputValue : 0;
  
  // Lógica para 'difference'
  const previewBalanceCredit = currentBalance + safeInputValue; // Devolver dinero
  const previewBalanceDebit = currentBalance - safeInputValue;  // Cobrar dinero

  // Lógica para 'absolute'
  // Diferencia = (A donde quiero llegar) - (Donde estoy)
  const differenceAbsolute = safeInputValue - currentBalance;

  const executeAdjustment = async (isCredit: boolean) => {
    if (!selectedPersonId || !selectedPerson) return Alert.alert('Error', 'Selecciona una persona');
    
    // VALIDACIÓN CORREGIDA
    if (!amountInput.trim() || !validAmount) return Alert.alert('Error', 'Ingresa un monto válido');
    
    // Solo en modo "Diferencia" exigimos que sea mayor a 0 (no puedes corregir por 0)
    if (mode === 'difference' && safeInputValue <= 0) {
        return Alert.alert('Error', 'La diferencia debe ser mayor a 0. Si quieres fijar el saldo en 0, usa el modo "Fijar Saldo".');
    }

    if (!reason.trim()) return Alert.alert('Error', 'El motivo es obligatorio');

    // Determinar el monto exacto del ajuste según el modo
    let finalAdjustmentAmount = 0;
    let finalIsCredit = isCredit; // true = Payment (Sube), false = Purchase (Baja)

    if (mode === 'difference') {
        finalAdjustmentAmount = safeInputValue;
    } else {
        // Modo Absoluto: Calculamos la diferencia nosotros
        if (Math.abs(differenceAbsolute) === 0) return Alert.alert('Aviso', 'El saldo ya es igual al monto ingresado.');
        
        finalAdjustmentAmount = Math.abs(differenceAbsolute);
        finalIsCredit = differenceAbsolute > 0; // Si es positivo, hay que ABONAR para subir. Si es negativo, hay que RESTAR.
    }

    const actionText = finalIsCredit ? 'ABONAR (A favor)' : 'CARGAR (Deuda)';
    const newBalance = finalIsCredit 
        ? (currentBalance + finalAdjustmentAmount) 
        : (currentBalance - finalAdjustmentAmount);

    Alert.alert(
      'Confirmar Ajuste',
      `Acción: ${actionText}\n` +
      `Monto del ajuste: ₡${finalAdjustmentAmount}\n\n` +
      `Saldo Anterior: ₡${currentBalance}\n` +
      `👉 NUEVO SALDO: ₡${newBalance}\n\n` +
      `Motivo: ${reason}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setLoading(true);
            try {
              if (finalIsCredit) {
                const adjustmentPayment: Payment = {
                  id: uuid.v4() as string,
                  personId: selectedPersonId,
                  amount: finalAdjustmentAmount,
                  date: getLocalDateString(new Date()),
                  type: 'manualAdjustment',
                  comment: `Ajuste: ${reason}`
                };
                await addPayment(adjustmentPayment);
              } else {
                const adjustmentCharge: Purchase = {
                  id: uuid.v4() as string,
                  personId: selectedPersonId,
                  amount: finalAdjustmentAmount,
                  date: getLocalDateString(new Date()),
                  description: `Ajuste: ${reason}`
                };
                await addPurchase(adjustmentCharge);
              }
              Alert.alert('Éxito', 'Ajuste realizado correctamente.');
              navigation.goBack();
            } catch (error) {
              console.error('Error al ajustar:', error);
              Alert.alert('Error', 'Falló el ajuste.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const styles = createStyles(isDark);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>1. Seleccionar persona:</Text>
      
      {selectedPerson ? (
        <View style={styles.selectedRow}>
          <Text style={styles.selected}>👤 {selectedPerson.name}</Text>
          <TouchableOpacity
            onPress={() => {
              setSelectedPersonId('');
              setInputFocused(true);
              setAmountInput('');
            }}
          >
            <Text style={styles.changeBtn}>✏️ Cambiar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput
            style={[styles.input, { fontSize: 18 }]}
            placeholder="Buscar por nombre..."
            placeholderTextColor={isDark ? '#999' : '#666'}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setInputFocused(true)}
          />
          {inputFocused && filteredResults.length > 0 && (
            <FlatList
              data={filteredResults}
              keyExtractor={(item: any) => item.id}
              style={{ maxHeight: 150 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handleSelectPerson(item)}
                >
                  <Text style={[commonStyles.listText, { color: isDark ? '#eee' : '#000' }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}

      {selectedPerson && (
        <>
            {/* VISTA DEL SALDO ACTUAL */}
            <View style={styles.balanceCard}>
                <Text style={styles.balanceTitle}>Saldo Actual</Text>
                <Text style={[styles.balanceText, { color: currentBalance < 0 ? '#ff4444' : '#4caf50' }]}>
                    ₡{currentBalance}
                </Text>
            </View>

            {/* SELECTOR DE MODO */}
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tab, mode === 'difference' && styles.activeTab]}
                    onPress={() => { setMode('difference'); setAmountInput(''); }}
                >
                    <Text style={[styles.tabText, mode === 'difference' && styles.activeTabText]}>🔄 Corregir Error</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, mode === 'absolute' && styles.activeTab]}
                    onPress={() => { setMode('absolute'); setAmountInput(''); }}
                >
                    <Text style={[styles.tabText, mode === 'absolute' && styles.activeTabText]}>🎯 Fijar Saldo</Text>
                </TouchableOpacity>
            </View>

            {/* INPUTS SEGÚN MODO */}
            <Text style={styles.label}>
                {mode === 'difference' 
                    ? '2. ¿De cuánto fue el error / diferencia?' 
                    : '2. ¿Cuál debe ser el saldo final exacto?'}
            </Text>
            
            <TextInput
                style={[styles.input, { fontSize: 24, fontWeight: 'bold', textAlign: 'center' }]}
                keyboardType="numeric" // Acepta negativos en la mayoría de teclados
                placeholder={mode === 'difference' ? "Ej: 5000" : "Ej: 0 o -2000"}
                placeholderTextColor="#888"
                value={amountInput}
                onChangeText={setAmountInput}
            />

            <Text style={styles.label}>3. Motivo (Obligatorio):</Text>
            <TextInput
                style={styles.input}
                placeholder="Ej: Cobro duplicado, Reset de cuenta..."
                placeholderTextColor={isDark ? '#999' : '#666'}
                value={reason}
                onChangeText={setReason}
            />

            {/* BOTONES DE ACCIÓN */}
            <View style={{marginTop: 20}}>
                {mode === 'difference' ? (
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        {/* BOTÓN DEVOLVER (Abonar) */}
                        <TouchableOpacity 
                            style={[styles.actionBtn, {backgroundColor: '#4caf50', marginRight: 5}]}
                            onPress={() => executeAdjustment(true)}
                            disabled={loading}
                        >
                             <Text style={styles.btnText}>Devolver / Abonar</Text>
                             <Text style={styles.previewText}>Nuevo Saldo: ₡{previewBalanceCredit}</Text>
                        </TouchableOpacity>

                        {/* BOTÓN COBRAR (Restar) */}
                        <TouchableOpacity 
                            style={[styles.actionBtn, {backgroundColor: '#f44336', marginLeft: 5}]}
                            onPress={() => executeAdjustment(false)}
                            disabled={loading}
                        >
                             <Text style={styles.btnText}>Cobrar / Restar</Text>
                             <Text style={styles.previewText}>Nuevo Saldo: ₡{previewBalanceDebit}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // MODO ABSOLUTO (Un solo botón)
                    <View style={{flexDirection: 'row'}}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, {backgroundColor: '#2196f3'}]}
                        onPress={() => executeAdjustment(differenceAbsolute > 0)}
                        disabled={loading}
                    >
                         <Text style={styles.btnText}>Establecer Saldo en ₡{safeInputValue}</Text>
                         <Text style={styles.previewText}>
                            {validAmount 
                                ? `El sistema aplicará un ${differenceAbsolute > 0 ? 'ABONO' : 'CARGO'} de ₡${Math.abs(differenceAbsolute)}`
                                : 'Ingresa un monto para ver el ajuste'}
                         </Text>
                    </TouchableOpacity>
                    </View>
                )}
            </View>
            
            {loading && <ActivityIndicator style={{marginTop: 10}} color="#fff"/>}
        </>
      )}
    </View>
  );
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: isDark ? '#111' : '#fff',
    },
    label: {
      fontSize: 16,
      marginTop: 15,
      marginBottom: 5,
      fontWeight: '600',
      color: isDark ? '#eee' : '#000',
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? '#555' : '#ccc',
      borderRadius: 8,
      padding: 12,
      marginBottom: 5,
      backgroundColor: isDark ? '#222' : '#fafafa',
      color: isDark ? '#fff' : '#000',
    },
    selectedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: isDark ? '#2a2a2a' : '#e3f2fd',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#444' : '#bbdefb'
    },
    selected: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#0d47a1',
    },
    changeBtn: { color: '#2196f3', fontWeight: 'bold' },
    item: {
      padding: 12,
      borderBottomWidth: 1,
      borderColor: isDark ? '#444' : '#eee',
    },
    
    // Estilos Nuevos
    balanceCard: {
        alignItems: 'center',
        marginVertical: 15,
        padding: 10,
        backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
        borderRadius: 8
    },
    balanceTitle: { color: '#888', fontSize: 14, textTransform: 'uppercase' },
    balanceText: { fontSize: 28, fontWeight: 'bold' },

    tabContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        borderRadius: 8,
        backgroundColor: isDark ? '#333' : '#e0e0e0',
        padding: 2
    },
    tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 6 },
    activeTab: { backgroundColor: isDark ? '#555' : '#fff', elevation: 2 },
    tabText: { fontWeight: '600', color: isDark ? '#aaa' : '#666' },
    activeTabText: { color: isDark ? '#fff' : '#000' },

    actionBtn: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3
    },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    previewText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4, textAlign: 'center' }
  });
}