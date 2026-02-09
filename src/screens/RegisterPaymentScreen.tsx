import React, { useContext, useState, useMemo } from 'react';
import { commonStyles } from '../Styles/commonStyles';
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
import { DataContext } from '../context/DataContext';
import { Payment } from '../models';
import uuid from 'react-native-uuid';
import { useTheme } from '../context/ThemeContext';
import { getLocalDateString } from '../utils/dateUtils';
import { useNavigation } from '@react-navigation/native'; // <--- IMPORTANTE

export default function RegisterPaymentScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation(); // <--- Hook para irnos al terminar

  const context = useContext(DataContext);
  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { persons, addPayment } = context;

  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [amount, setAmount] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [paymentType, setPaymentType] = useState<'debtPayment' | 'prepaid'>('debtPayment');
  
  // --- FRENO DE MANO ---
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPerson = persons.find((p) => p.id === selectedPersonId);

  const filteredPersons = useMemo(() => {
    if (!search) return [];
    return persons
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 5);
  }, [persons, search]);

  const currentBalance = selectedPerson?.currentBalance || 0;
  
  const handleRegisterPayment = async () => {
    if (isSubmitting) return; // <--- BLOQUEA EL DOBLE CLICK

    if (!selectedPersonId) {
      Alert.alert('Error', 'Selecciona una persona');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Monto inválido');
      return;
    }

    setIsSubmitting(true); // <--- ACTIVAMOS EL FRENO

    const newPayment: Payment = {
      id: uuid.v4() as string,
      personId: selectedPersonId,
      amount: parsedAmount,
      date: getLocalDateString(new Date()),
      type: paymentType,
    };

    try {
      await addPayment(newPayment);
      
      // ALERTA Y SALIDA (Esto evita que le den click de nuevo por error)
      Alert.alert(
          'Pago Exitoso', 
          `Se registró el pago de ₡${parsedAmount}`,
          [
              { text: 'OK', onPress: () => navigation.goBack() } 
          ]
      );

    } catch (error) {
      console.error('Error al registrar pago:', error);
      Alert.alert('Error', 'No se pudo registrar el pago.');
      setIsSubmitting(false); // Solo soltamos el freno si hubo error
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { fontSize: 18 }]}>Buscar persona:</Text>

      {selectedPerson ? (
        <View style={styles.selectedRow}>
          <Text style={[styles.selected, {color: theme === 'dark' ? '#81c784' : 'green'}]}>
            Seleccionado: {selectedPerson.name}
          </Text>
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
            placeholder="Nombre o inicial"
            placeholderTextColor={theme === 'dark' ? '#aaa' : undefined}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setInputFocused(true)}
          />
          {inputFocused && search.length > 0 && (
            <FlatList
              data={filteredPersons}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 150 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    setSelectedPersonId(item.id);
                    setInputFocused(false);
                    setSearch('');
                    // Lógica inteligente: Si debe plata, sugerimos pagar deuda
                    const balance = item.currentBalance || 0;
                    setPaymentType(balance < 0 ? 'debtPayment' : 'prepaid');
                  }}
                >
                  <Text style={[commonStyles.itemText, { color: theme === 'dark' ? '#fff' : '#000' }]}>
                    {item.name} {item.isFavorite ? '⭐' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}

      {selectedPerson && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <TouchableOpacity
            style={{
              padding: 12,
              backgroundColor: paymentType === 'debtPayment' ? '#f05454' : (theme === 'dark' ? '#333' : '#ddd'),
              borderRadius: 8,
              flex: 1,
              marginRight: 5,
              alignItems: 'center'
            }}
            onPress={() => setPaymentType('debtPayment')}
          >
            <Text style={{ color: paymentType === 'debtPayment' ? '#fff' : (theme === 'dark' ? '#ccc' : '#000'), fontWeight: 'bold' }}>
              💰 Pagar Deuda
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              padding: 12,
              backgroundColor: paymentType === 'prepaid' ? '#4caf50' : (theme === 'dark' ? '#333' : '#ddd'),
              borderRadius: 8,
              flex: 1,
              marginLeft: 5,
              alignItems: 'center'
            }}
            onPress={() => setPaymentType('prepaid')}
          >
            <Text style={{ color: paymentType === 'prepaid' ? '#fff' : (theme === 'dark' ? '#ccc' : '#000'), fontWeight: 'bold' }}>
              💼 Abonar / Prepago
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedPerson && (
         <Text style={{ 
             textAlign: 'center', 
             marginBottom: 10, 
             fontWeight: 'bold',
             fontSize: 18,
             color: currentBalance < 0 ? '#ff4444' : '#4caf50'
         }}>
            Saldo actual: ₡{currentBalance}
         </Text>
      )}

      <Text style={[styles.label, { fontSize: 18 }]}>Monto del pago:</Text>
      <TextInput
        style={[styles.input, { fontSize: 18 }]}
        placeholder="₡"
        placeholderTextColor={theme === 'dark' ? '#aaa' : undefined}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <TouchableOpacity
        style={[
            styles.button, 
            { backgroundColor: '#28a745' },
            isSubmitting && { opacity: 0.6 } 
        ]}
        onPress={handleRegisterPayment}
        disabled={isSubmitting} // <--- ¡AQUÍ ESTÁ LA MAGIA!
      >
        {isSubmitting ? (
            <ActivityIndicator color="#fff" />
        ) : (
            <Text style={styles.buttonText}>
                {selectedPerson && paymentType === 'debtPayment' ? 'Confirmar Pago' : 'Registrar Abono'}
            </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (theme: 'light' | 'dark') =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: theme === 'dark' ? '#121212' : '#fff',
    },
    label: {
      marginTop: 10,
      marginBottom: 5,
      color: theme === 'dark' ? '#fff' : '#000',
    },
    input: {
      borderWidth: 1,
      borderColor: theme === 'dark' ? '#666' : '#aaa',
      borderRadius: 4,
      padding: 10,
      marginBottom: 10,
      color: theme === 'dark' ? '#fff' : '#000',
    },
    selectedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      padding: 10,
      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f0f0f0',
      borderRadius: 8
    },
    selected: {
      fontStyle: 'italic',
      fontWeight: 'bold'
    },
    changeBtn: {
      color: '#007bff',
      fontWeight: 'bold',
    },
    item: {
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderColor: theme === 'dark' ? '#444' : '#ddd',
      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#fafafa'
    },
    button: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    }
  });