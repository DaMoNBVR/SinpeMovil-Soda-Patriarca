import React, { useContext, useState } from 'react';
import {
  View, Text, TextInput, Button, Alert,
  StyleSheet, Switch, FlatList, TouchableOpacity
} from 'react-native';
import { DataContext } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import uuid from 'react-native-uuid';
import { Person } from '../models';
import { commonStyles } from '../Styles/commonStyles';

export default function ManagePeopleScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);

  const context = useContext(DataContext);
  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { persons, addPerson, deletePerson } = context;

  const [name, setName] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [editMode, setEditMode] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const handleAddOrUpdate = () => {
    const trimmedName = name.trim();
    const trimmedGuardianName = guardianName.trim();
    const trimmedGuardianPhone = guardianPhone.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    const isDuplicate = persons.some(
      (p) =>
        p.name.toLowerCase() === trimmedName.toLowerCase() &&
        (!editMode || p.id !== selectedPerson?.id)
    );

    if (isDuplicate) {
      Alert.alert('Error', 'Ya existe una persona con ese nombre');
      return;
    }

    const person: Person = {
      id: editMode && selectedPerson ? selectedPerson.id : uuid.v4() as string,
      name: trimmedName,
      isFavorite,
      prepaidAmount: editMode && selectedPerson ? selectedPerson.prepaidAmount : 0,
      guardianName: trimmedGuardianName || '',
      guardianPhone: trimmedGuardianPhone || '',
    };

    addPerson(person);

    Alert.alert('Éxito', editMode ? 'Persona actualizada' : 'Persona agregada');
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setIsFavorite(false);
    setGuardianName('');
    setGuardianPhone('');
    setEditMode(false);
    setSelectedPerson(null);
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

  const startEdit = (person: Person) => {
    setSelectedPerson(person);
    setName(person.name);
    setIsFavorite(person.isFavorite ?? false);
    setGuardianName(person.guardianName || '');
    setGuardianPhone(person.guardianPhone || '');
    setEditMode(true);
  };

  const filteredPersons = persons
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const renderPersonItem = ({ item }: { item: Person }) => (
    <View style={styles.personRow}>
      <View style={{ flex: 1 }}>
        <Text style={[commonStyles.itemText, { color: isDark ? '#fff' : '#000' }]}>
          {item.name} {item.isFavorite ? '⭐' : ''}
        </Text>
        {item.guardianName ? <Text style={[styles.guardianText]}>Encargado: {item.guardianName}</Text> : null}
        {item.guardianPhone ? <Text style={[styles.guardianText]}>Tel: {item.guardianPhone}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => startEdit(item)}>
        <Text style={{ fontSize: 16, color: 'blue', marginRight: 12 }}>✏️</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => confirmDelete(item.id, item.name)}>
        <Text style={{ fontSize: 16, color: 'red' }}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={[commonStyles.title, { color: isDark ? '#fff' : '#000' }]}>Gestión de Personas</Text>

      <Text style={styles.label}>Nombre:</Text>
      <TextInput
        style={[styles.input, { fontSize: 18 }]}
        placeholder="Ej. Juan Pérez"
        placeholderTextColor={isDark ? '#aaa' : '#666'}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Encargado legal (opcional):</Text>
      <TextInput
        style={[styles.input, { fontSize: 18 }]}
        placeholder="Ej. Madre de Juan"
        placeholderTextColor={isDark ? '#aaa' : '#666'}
        value={guardianName}
        onChangeText={setGuardianName}
      />

      <Text style={styles.label}>Tel. encargado legal (opcional):</Text>
      <TextInput
        style={[styles.input, { fontSize: 18 }]}
        placeholder="Ej. 8888-9999"
        keyboardType="phone-pad"
        placeholderTextColor={isDark ? '#aaa' : '#666'}
        value={guardianPhone}
        onChangeText={setGuardianPhone}
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Marcar como favorita</Text>
        <Switch value={isFavorite} onValueChange={setIsFavorite} />
      </View>

      <Button title={editMode ? 'Actualizar persona' : 'Agregar persona'} onPress={handleAddOrUpdate} />
      <View style={{ marginVertical: 5 }} />
      {editMode && <Button title="Cancelar edición" color="gray" onPress={resetForm} />}

      <Text style={[commonStyles.section, { color: isDark ? '#fff' : '#000' }]}>Buscar persona:</Text>
      <TextInput
        style={[styles.input, { fontSize: 18 }]}
        placeholder="Buscar por nombre"
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholderTextColor={isDark ? '#aaa' : '#666'}
      />

      <FlatList
        data={filteredPersons}
        keyExtractor={(item) => item.id}
        renderItem={renderPersonItem}
      />
    </View>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: isDark ? '#121212' : '#fff' },
  label: { fontSize: 18, marginBottom: 6, color: isDark ? '#fff' : '#000' },
  input: {
    borderWidth: 1, borderColor: isDark ? '#555' : '#aaa', borderRadius: 4,
    padding: 10, marginBottom: 12, color: isDark ? '#fff' : '#000'
  },
  switchRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  personRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, paddingVertical: 10,
    borderColor: isDark ? '#444' : '#ddd',
  },
  guardianText: { fontSize: 16, color: isDark ? '#ccc' : '#555' },
});