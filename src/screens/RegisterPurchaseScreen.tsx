import React, { useContext, useState, useMemo } from 'react';
import { commonStyles } from '../Styles/commonStyles';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { DataContext } from '../context/DataContext';
import { Purchase } from '../models';
import uuid from 'react-native-uuid';
import { useTheme } from '../context/ThemeContext';
import { getLocalDateString } from '../utils/dateUtils';

export default function RegisterPurchaseScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const context = useContext(DataContext);
  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { persons, addPurchase } = context;

  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  
  // --- FRENO DE MANO PARA EVITAR DUPLICADOS ---
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPerson = persons.find((p) => p.id === selectedPersonId);

  // Búsqueda instantánea en memoria (optimizado con useMemo)
  const filteredPersons = useMemo(() => {
    if (!search) return [];
    return persons
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 5); // Limitamos a 5 sugerencias
  }, [persons, search]);

  const handleRegisterPurchase = async () => {
    if (isSubmitting) return; // Evita doble click

    if (!selectedPersonId) {
      Alert.alert('Error', 'Selecciona una persona');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Monto inválido');
      return;
    }

    setIsSubmitting(true);

    const newPurchase: Purchase = {
      id: uuid.v4() as string,
      personId: selectedPersonId,
      amount: parsedAmount,
      date: getLocalDateString(new Date()),
      description: description.trim(),
    };

    try {
      await addPurchase(newPurchase);
      Alert.alert('Éxito', 'Compra registrada');
      
      // Resetear campos
      setAmount('');
      setDescription('');
      setSelectedPersonId('');
      setSearch('');
      setInputFocused(false);
    } catch (error) {
      console.error('Error al registrar compra:', error);
      Alert.alert('Error', 'No se pudo registrar la compra.');
    } finally {
      setIsSubmitting(false); // Liberamos el botón
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
         <Text style={{ 
             textAlign: 'center', 
             marginBottom: 10, 
             fontWeight: 'bold',
             fontSize: 16,
             color: (selectedPerson.currentBalance || 0) < 0 ? '#ff4444' : '#4caf50'
         }}>
            Saldo actual: ₡{selectedPerson.currentBalance || 0}
         </Text>
      )}

      <Text style={[styles.label, { fontSize: 18 }]}>Monto:</Text>
      <TextInput
        style={[styles.input, { fontSize: 18 }]}
        placeholder="Monto en colones"
        placeholderTextColor={theme === 'dark' ? '#aaa' : undefined}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={[styles.label, { fontSize: 18 }]}>Descripción (opcional):</Text>
      <TextInput
        style={[styles.input, { fontSize: 18 }]}
        placeholder="Descripción"
        placeholderTextColor={theme === 'dark' ? '#aaa' : undefined}
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity
        style={[
            styles.button, 
            isSubmitting && { opacity: 0.6 } 
        ]}
        onPress={handleRegisterPurchase}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
            <ActivityIndicator color="#fff" />
        ) : (
            <Text style={styles.buttonText}>Registrar Compra</Text>
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
        backgroundColor: '#007bff',
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