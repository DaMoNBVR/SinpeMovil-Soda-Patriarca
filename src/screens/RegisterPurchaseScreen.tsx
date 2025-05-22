// src/screens/RegisterPurchaseScreen.tsx
import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { DataContext } from '../context/DataContext';
import { Purchase } from '../models';
import uuid from 'react-native-uuid';
import { Picker } from '@react-native-picker/picker';

export default function RegisterPurchaseScreen() {
  const dataContext = useContext(DataContext);
  if (!dataContext) throw new Error('DataContext no encontrado');

  const { persons, addPurchase } = dataContext;

  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!selectedPersonId) {
      Alert.alert('Error', 'Por favor selecciona una persona');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido mayor que cero');
      return;
    }

    const newPurchase: Purchase = {
      id: uuid.v4() as string,
      personId: selectedPersonId,
      date: new Date().toISOString().split('T')[0],
      amount: parsedAmount,
      description: description.trim(),
    };

    addPurchase(newPurchase);
    Alert.alert('Éxito', 'Compra registrada');
    setAmount('');
    setDescription('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Selecciona persona:</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedPersonId}
          onValueChange={(itemValue) => setSelectedPersonId(itemValue)}
        >
          <Picker.Item label="Selecciona una persona" value="" />
          {persons.map((person) => (
            <Picker.Item key={person.id} label={person.name} value={person.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Monto:</Text>
      <TextInput
        style={styles.input}
        placeholder="Monto en colones"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={styles.label}>Descripción (opcional):</Text>
      <TextInput
        style={styles.input}
        placeholder="Descripción"
        value={description}
        onChangeText={setDescription}
      />

      <Button title="Registrar compra" onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { marginTop: 10, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 4,
    marginBottom: 10,
  },
});
