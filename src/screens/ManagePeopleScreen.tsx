import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Switch,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { DataContext } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import uuid from 'react-native-uuid';

export default function ManagePeopleScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);

  const context = useContext(DataContext);
  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { persons, addPerson, deletePerson } = context;

  const [name, setName] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  const handleAdd = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    const alreadyExists = persons.some(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (alreadyExists) {
      Alert.alert('Error', 'Ya existe una persona con ese nombre');
      return;
    }

    addPerson({
      id: uuid.v4() as string,
      name: trimmedName,
      isFavorite,
      prepaidAmount: 0,
    });

    Alert.alert('Éxito', 'Persona agregada');
    setName('');
    setIsFavorite(false);
  };

  const confirmDelete = (personId: string, personName: string) => {
    Alert.alert(
      'Eliminar',
      `¿Estás seguro de eliminar a ${personName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deletePerson(personId),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestión de Personas</Text>

      <Text style={styles.label}>Nombre:</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. Juan Pérez"
        placeholderTextColor={isDark ? '#aaa' : '#666'}
        value={name}
        onChangeText={setName}
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Marcar como favorita</Text>
        <Switch value={isFavorite} onValueChange={setIsFavorite} />
      </View>

      <Button title="Agregar persona" onPress={handleAdd} />

      <Text style={styles.subtitle}>Personas registradas:</Text>
      <FlatList
        data={persons.sort((a, b) => a.name.localeCompare(b.name))}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.personRow}>
            <Text style={styles.personName}>
              {item.name} {item.isFavorite ? '⭐' : ''}
            </Text>
            <TouchableOpacity onPress={() => confirmDelete(item.id, item.name)}>
              <Text style={styles.deleteText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: isDark ? '#121212' : '#fff',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      color: isDark ? '#fff' : '#000',
    },
    label: {
      fontSize: 16,
      marginBottom: 6,
      color: isDark ? '#fff' : '#000',
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? '#555' : '#aaa',
      borderRadius: 4,
      padding: 10,
      marginBottom: 16,
      color: isDark ? '#fff' : '#000',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    subtitle: {
      fontSize: 18,
      fontWeight: '600',
      marginVertical: 16,
      color: isDark ? '#fff' : '#000',
    },
    personRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderColor: isDark ? '#444' : '#ddd',
    },
    personName: {
      fontSize: 16,
      color: isDark ? '#fff' : '#000',
    },
    deleteText: {
      color: 'red',
      fontSize: 18,
    },
  });
