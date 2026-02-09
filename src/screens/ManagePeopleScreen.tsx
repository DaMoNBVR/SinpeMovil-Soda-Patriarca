import React, { useState, useContext, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  Keyboard 
} from 'react-native';
import { DataContext } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Person } from '../models';

export default function ManagePeopleScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);

  const context = useContext(DataContext);
  if (!context) return null;
  const { persons, addPerson, deletePerson, editPerson } = context;

  // Estados del formulario
  const [name, setName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  
  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para saber si estamos editando
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtramos la lista según la búsqueda
  const filteredPersons = useMemo(() => {
    if (!searchTerm) return persons;
    return persons.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [persons, searchTerm]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        // MODO EDICIÓN
        const personToUpdate = persons.find(p => p.id === editingId);
        if (personToUpdate) {
            const updatedPerson: Person = {
                ...personToUpdate,
                name: name.trim(),
                guardianName: guardianName.trim(),
                guardianPhone: guardianPhone.trim()
            };
            await editPerson(updatedPerson);
            Alert.alert('Éxito', 'Cliente actualizado');
        }
      } else {
        // MODO CREACIÓN
        await addPerson({
            name: name.trim(),
            guardianName: guardianName.trim(),
            guardianPhone: guardianPhone.trim()
        });
        Alert.alert('Éxito', 'Cliente agregado');
      }
      
      // Limpiar formulario
      resetForm();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Hubo un problema al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (person: Person) => {
    setEditingId(person.id);
    setName(person.name);
    // Aquí mapeamos correctamente tus campos de la DB al formulario
    setGuardianName(person.guardianName || ''); 
    setGuardianPhone(person.guardianPhone || '');
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Eliminar Cliente',
      `¿Estás seguro de eliminar a ${name}? Se borrará todo su historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
             try {
                await deletePerson(id);
                if (editingId === id) resetForm();
             } catch(e) {
                Alert.alert('Error', 'No se pudo eliminar');
             }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setGuardianName('');
    setGuardianPhone('');
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      
      {/* --- FORMULARIO DE GESTIÓN --- */}
      <View style={styles.formContainer}>
        <Text style={styles.title}>
            {editingId ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Nombre del Cliente / Estudiante"
          placeholderTextColor={isDark ? '#aaa' : '#666'}
          value={name}
          onChangeText={setName}
        />
        
        <View style={styles.rowInputs}>
            <TextInput
                style={[styles.input, {flex: 1, marginRight: 5}]}
                placeholder="Encargado"
                placeholderTextColor={isDark ? '#aaa' : '#666'}
                value={guardianName}
                onChangeText={setGuardianName}
            />
            <TextInput
                style={[styles.input, {flex: 1, marginLeft: 5}]}
                placeholder="Teléfono"
                placeholderTextColor={isDark ? '#aaa' : '#666'}
                value={guardianPhone}
                onChangeText={setGuardianPhone}
                keyboardType="phone-pad"
            />
        </View>

        <View style={styles.buttonRow}>
            {editingId && (
                <TouchableOpacity 
                    style={[styles.btn, styles.cancelBtn]} 
                    onPress={resetForm}
                    disabled={loading}
                >
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
            )}

            <TouchableOpacity 
                style={[styles.btn, styles.saveBtn, loading && {opacity: 0.5}]} 
                onPress={handleSubmit}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff"/> 
                ) : (
                    <Text style={styles.btnText}>
                        {editingId ? 'Guardar Cambios' : 'Agregar Cliente'}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
      </View>

      {/* --- BARRA DE BÚSQUEDA --- */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={isDark ? '#aaa' : '#666'} style={{marginRight: 10}} />
        <TextInput 
            style={{flex: 1, color: isDark ? '#fff' : '#000', fontSize: 16}}
            placeholder="Buscar en la lista..."
            placeholderTextColor={isDark ? '#aaa' : '#666'}
            value={searchTerm}
            onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={20} color={isDark ? '#aaa' : '#666'} />
            </TouchableOpacity>
        )}
      </View>

      {/* --- LISTA --- */}
      <Text style={styles.subtitle}>Listado ({filteredPersons.length})</Text>

      <FlatList
        data={filteredPersons}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={[styles.item, editingId === item.id && styles.activeItem]}>
            <View style={{flex: 1}}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                {/* Aquí mostramos los datos reales si existen */}
                {(item.guardianName || item.guardianPhone) ? (
                    <Text style={styles.itemSubtitle}>
                        {item.guardianName ? `👤 ${item.guardianName} ` : ''}
                        {item.guardianPhone ? `📞 ${item.guardianPhone}` : ''}
                    </Text>
                ) : null}
            </View>
            
            <View style={styles.actionButtons}>
                <TouchableOpacity onPress={() => handleEdit(item)} style={{marginRight: 15}}>
                    <Ionicons name="pencil" size={24} color="#2196f3" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                    <Ionicons name="trash-outline" size={24} color="#ff4444" />
                </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: isDark ? '#121212' : '#f5f5f5' },
  formContainer: {
    backgroundColor: isDark ? '#1e1e1e' : '#fff',
    padding: 15, borderRadius: 12, marginBottom: 15,
    elevation: 3, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: isDark ? '#2a2a2a' : '#e0e0e0',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    marginBottom: 15
  },
  title: {
    fontSize: 18, fontWeight: 'bold', marginBottom: 15,
    color: isDark ? '#fff' : '#333', textAlign: 'center'
  },
  input: { 
    borderWidth: 1, borderColor: isDark ? '#444' : '#ccc', 
    borderRadius: 8, padding: 10, marginBottom: 10, 
    color: isDark ? '#fff' : '#000', backgroundColor: isDark ? '#2a2a2a' : '#fafafa' 
  },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  buttonRow: { flexDirection: 'row', marginTop: 5 },
  btn: { 
    borderRadius: 8, justifyContent: 'center', alignItems: 'center', padding: 12
  },
  saveBtn: { flex: 1, backgroundColor: '#007bff' },
  cancelBtn: { width: 50, backgroundColor: '#666', marginRight: 10 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  subtitle: { 
    fontSize: 16, fontWeight: '600', marginBottom: 10, 
    color: isDark ? '#aaa' : '#555' 
  },
  item: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 15, marginBottom: 10, borderRadius: 8,
    backgroundColor: isDark ? '#1e1e1e' : '#fff',
    elevation: 1
  },
  activeItem: {
    borderWidth: 1, borderColor: '#2196f3', backgroundColor: isDark ? '#192530' : '#e3f2fd'
  },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: isDark ? '#eee' : '#000' },
  itemSubtitle: { fontSize: 13, color: isDark ? '#aaa' : '#666', marginTop: 4 },
  actionButtons: { flexDirection: 'row' }
});