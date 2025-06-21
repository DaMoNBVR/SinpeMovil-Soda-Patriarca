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
import { Purchase } from '../models';
import uuid from 'react-native-uuid';

export default function RegisterPurchaseScreen() {
  const context = useContext(DataContext);
  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { persons, addPurchase } = context;

  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  const selectedPerson = persons.find((p) => p.id === selectedPersonId);

  const filteredPersons = persons
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });

  const handleRegisterPurchase = () => {
    if (!selectedPersonId) {
      Alert.alert('Error', 'Selecciona una persona');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Monto inválido');
      return;
    }

    const newPurchase: Purchase = {
      id: uuid.v4() as string,
      personId: selectedPersonId,
      amount: parsedAmount,
      date: new Date().toISOString().split('T')[0],
      description: description.trim(),
    };

    addPurchase(newPurchase);
    Alert.alert('Éxito', 'Compra registrada');
    setAmount('');
    setDescription('');
    setSelectedPersonId('');
    setSearch('');
    setInputFocused(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Buscar persona:</Text>

      {selectedPerson ? (
        <View style={styles.selectedRow}>
          <Text style={styles.selected}>
            Seleccionado: {selectedPerson.name} {selectedPerson.isFavorite ? '⭐' : ''}
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
            style={styles.input}
            placeholder="Nombre o inicial"
            value={search}
            onChangeText={setSearch}
            onFocus={() => setInputFocused(true)}
            onBlur={() => {
              // Opcional: puedes mantenerlo abierto o cerrarlo cuando pierda el foco
              // setInputFocused(false);
            }}
          />
          {inputFocused && (
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
                  <Text>
                    {item.name} {item.isFavorite ? '⭐' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}

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

      <Button title="Registrar compra" onPress={handleRegisterPurchase} />
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
  selectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selected: {
    fontStyle: 'italic',
    color: 'green',
  },
  changeBtn: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  item: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
});
