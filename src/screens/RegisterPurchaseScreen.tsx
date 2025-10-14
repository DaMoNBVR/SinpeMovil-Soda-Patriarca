import React, { useContext, useState } from 'react';
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
      date: getLocalDateString(new Date()),
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
      <Text style={[styles.label, { fontSize: 18 }]}>Buscar persona:</Text>

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
            style={[styles.input, { fontSize: 18 }]}
            placeholder="Nombre o inicial"
            placeholderTextColor={theme === 'dark' ? '#aaa' : undefined}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setInputFocused(true)}
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
                  <Text style={[commonStyles.itemText, { color: theme === 'dark' ? '#fff' : '#000' }]}>
                    {item.name} {item.isFavorite ? '⭐' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </>
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

      <Button title="Registrar compra" onPress={handleRegisterPurchase} />
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
      padding: 8,
      marginBottom: 10,
      color: theme === 'dark' ? '#fff' : '#000',
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
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderColor: theme === 'dark' ? '#444' : '#ddd',
    },
    itemText: {
      color: theme === 'dark' ? '#fff' : '#000',
    },
  });
