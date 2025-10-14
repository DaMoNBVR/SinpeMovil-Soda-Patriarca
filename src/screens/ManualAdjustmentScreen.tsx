import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { DataContext } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import uuid from 'react-native-uuid';
import { Payment } from '../models';
import { commonStyles } from '../Styles/commonStyles';
import { getLocalDateString } from '../utils/dateUtils';

export default function ManualAdjustmentScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const context = useContext(DataContext);
  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { persons, addPayment, updatePrepaidAmount } = context;

  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  const selectedPerson = persons.find(p => p.id === selectedPersonId);

  const filteredPersons = persons
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });

  const handleAdjust = () => {
    if (!selectedPersonId) return Alert.alert('Error', 'Selecciona una persona');
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount === 0) return Alert.alert('Error', 'Monto inválido');

    Alert.alert(
      'Confirmar ajuste',
      `¿Aplicar ajuste de ${parsedAmount > 0 ? '₡' + parsedAmount : `-₡${Math.abs(parsedAmount)}`} a ${selectedPerson?.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: async () => {
            const newPayment: Payment = {
              id: uuid.v4() as string,
              personId: selectedPersonId,
              amount: parsedAmount,
              date: getLocalDateString(new Date()),
              type: 'manualAdjustment',
              comment,
            };
            try {
              await addPayment(newPayment);
              await updatePrepaidAmount(selectedPersonId, parsedAmount);
              setSearch('');
              setSelectedPersonId('');
              setAmount('');
              setComment('');
              Alert.alert('Éxito', 'Ajuste aplicado');
            } catch (error) {
              console.error('Error al aplicar ajuste manual:', error);
              Alert.alert('Error', 'No se pudo aplicar el ajuste.');
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
            placeholder="Nombre o inicial"
            placeholderTextColor={isDark ? '#999' : '#666'}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setInputFocused(true)}
          />
          {inputFocused && (
            <FlatList
              data={filteredPersons}
              keyExtractor={item => item.id}
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
                  <Text style={[commonStyles.listText, { color: isDark ? '#eee' : '#000' }]}>
                    {item.name} {item.isFavorite ? '⭐' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}

      <Text style={styles.label}>Monto del ajuste (₡):</Text>
      <TextInput
        style={[styles.input, { fontSize: 18 }]}
        keyboardType="numeric"
        placeholder="Ej: 500 o -500"
        placeholderTextColor={isDark ? '#999' : '#666'}
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={styles.label}>Comentario:</Text>
      <TextInput
        style={[styles.input, { fontSize: 18 }]}
        placeholder="Razón del ajuste"
        placeholderTextColor={isDark ? '#999' : '#666'}
        value={comment}
        onChangeText={setComment}
      />

      <Button title="Aplicar ajuste" onPress={handleAdjust} />
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
    label: { fontSize: 18,
      marginTop: 10,
      marginBottom: 5,
      color: isDark ? '#eee' : '#000',
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? '#888' : '#aaa',
      borderRadius: 4,
      padding: 8,
      marginBottom: 10,
      color: isDark ? '#fff' : '#000',
    },
    item: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderColor: isDark ? '#444' : '#ddd',
    },
    selectedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    selected: {
      fontStyle: 'italic',
      color: isDark ? '#aaffaa' : 'green',
    },
    changeBtn: {
      color: '#007bff',
      fontWeight: '600',
    },
  });
}
