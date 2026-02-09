import React, { useContext, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { DataContext } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/StackNavigator';
import { commonStyles } from '../Styles/commonStyles';
import uuid from 'react-native-uuid';
import { getLocalDateString } from '../utils/dateUtils';
import { Payment, Purchase } from '../models';

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

  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState(initialPersonId);
  const [targetBalance, setTargetBalance] = useState('');
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
    // Seteamos el saldo actual en el input para que veas cuánto tiene
    setTargetBalance(person.currentBalance?.toString() || '0');
  };

  const handleAdjust = () => {
    if (!selectedPersonId || !selectedPerson) return Alert.alert('Error', 'Selecciona una persona');
    
    // 1. ¿A cuánto quieres que llegue el saldo?
    const finalBalance = parseFloat(targetBalance);
    if (isNaN(finalBalance)) return Alert.alert('Error', 'Monto inválido');
    
    if (!reason.trim()) return Alert.alert('Error', 'El motivo del ajuste es obligatorio');

    const currentBalance = selectedPerson.currentBalance || 0;
    
    // 2. MATEMÁTICA: Calculamos la diferencia exacta
    // Ejemplo: Quiero 0. Tengo -2,000,000. Diferencia = 0 - (-2M) = +2M (Hacer un pago)
    const difference = finalBalance - currentBalance;

    if (Math.abs(difference) < 1) return Alert.alert('Aviso', 'El saldo ya es igual al monto ingresado.');

    const isCredit = difference > 0; // ¿Estamos sumando dinero? (Abono)
    const adjustmentAmount = Math.abs(difference);

    Alert.alert(
      'Confirmar ajuste',
      `Vas a cambiar el saldo de ₡${currentBalance} a ₡${finalBalance}.\n\n` +
      `Para lograr esto, se creará automáticamente un ${isCredit ? 'PAGO/ABONO' : 'CARGO/COMPRA'} de ₡${adjustmentAmount}.\n\n` +
      `Motivo: ${reason}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar y Corregir',
          onPress: async () => {
            setLoading(true);
            try {
              if (isCredit) {
                // Hay que subir el saldo (pagar deuda o abonar)
                const adjustmentPayment: Payment = {
                  id: uuid.v4() as string,
                  personId: selectedPersonId,
                  amount: adjustmentAmount,
                  date: getLocalDateString(new Date()),
                  type: 'manualAdjustment',
                  comment: `Ajuste Manual: ${reason} (Saldo ajustado a ${finalBalance})`
                };
                await addPayment(adjustmentPayment);
              } else {
                // Hay que bajar el saldo (crear deuda o quitar abono)
                const adjustmentCharge: Purchase = {
                  id: uuid.v4() as string,
                  personId: selectedPersonId,
                  amount: adjustmentAmount,
                  date: getLocalDateString(new Date()),
                  description: `Ajuste Manual: ${reason} (Saldo ajustado a ${finalBalance})`
                };
                await addPurchase(adjustmentCharge);
              }

              Alert.alert('Éxito', 'Saldo y transacciones corregidos correctamente.');
              navigation.goBack();
            } catch (error) {
              console.error('Error al ajustar:', error);
              Alert.alert('Error', 'No se pudo aplicar el ajuste.');
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
      <Text style={styles.label}>Seleccionar persona:</Text>
      
      {selectedPerson ? (
        <View style={styles.selectedRow}>
          <Text style={styles.selected}>Seleccionado: {selectedPerson.name}</Text>
          <TouchableOpacity
            onPress={() => {
              setSelectedPersonId('');
              setInputFocused(true);
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
            <View style={{marginVertical: 15, padding: 10, backgroundColor: isDark ? '#222' : '#e3f2fd', borderRadius: 8}}>
                <Text style={{color: isDark ? '#ccc' : '#555', textAlign:'center'}}>Saldo Actual (Calculado)</Text>
                <Text style={{fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: (selectedPerson.currentBalance || 0) < 0 ? '#ff4444' : '#4caf50'}}>
                    ₡{selectedPerson.currentBalance || 0}
                </Text>
            </View>
            
            <Text style={styles.label}>NUEVO SALDO DESEADO (₡):</Text>
            <Text style={{fontSize: 12, color: '#888', marginBottom: 5}}>
                Pon aquí cuánto debería tener REALMENTE esta persona.
                (Ej: Pon 0 si quieres borrar la deuda).
            </Text>
            <TextInput
                style={[styles.input, { fontSize: 24, fontWeight: 'bold' }]}
                keyboardType="numeric"
                value={targetBalance}
                onChangeText={setTargetBalance}
            />

            <Text style={styles.label}>Motivo (Obligatorio):</Text>
            <TextInput
                style={styles.input}
                placeholder="Ej: Corrección de error, Reset de cuenta..."
                placeholderTextColor={isDark ? '#999' : '#666'}
                value={reason}
                onChangeText={setReason}
            />

            <TouchableOpacity 
                style={[styles.btn, loading && {opacity: 0.5}]} 
                onPress={handleAdjust}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Corregir Saldo</Text>}
            </TouchableOpacity>
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
      color: isDark ? '#eee' : '#000',
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? '#888' : '#aaa',
      borderRadius: 4,
      padding: 10,
      marginBottom: 5,
      color: isDark ? '#fff' : '#000',
    },
    item: {
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderColor: isDark ? '#444' : '#ddd',
      backgroundColor: isDark ? '#222' : '#f9f9f9'
    },
    selectedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      padding: 10,
      backgroundColor: isDark ? '#222' : '#eee',
      borderRadius: 8
    },
    selected: {
      fontStyle: 'italic',
      color: isDark ? '#aaffaa' : 'green',
      fontWeight: 'bold'
    },
    changeBtn: {
      color: '#007bff',
      fontWeight: '600',
    },
    btn: {
        backgroundColor: '#2196f3',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 30
    },
    btnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18
    }
  });
}