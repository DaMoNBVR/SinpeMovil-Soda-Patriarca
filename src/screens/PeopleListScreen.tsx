import React, { useContext, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl // <--- IMPORTANTE
} from 'react-native';
import { DataContext } from '../context/DataContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

export default function PeopleListScreen() {
  const context = useContext(DataContext);
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false); // <--- ESTADO DE RECARGA

  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { persons, toggleFavorite, refreshData } = context;

  // Filtrado de duplicados por seguridad
  const uniquePersons = useMemo(() => {
    const map = new Map();
    persons.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [persons]);

  const filteredPersons = uniquePersons
    .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });

  const styles = getStyles(theme);

  // Función para el Pull to Refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Personas</Text>

      <TextInput
        style={[styles.input, { fontSize: 18 }]}
        placeholder="Buscar por nombre"
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholderTextColor={theme === 'dark' ? '#aaa' : '#666'}
      />

      <FlatList
        data={filteredPersons}
        keyExtractor={(item) => item.id}
        
        // --- OPTIMIZACIÓN ---
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}

        // --- REFRESH CONTROL (LA MAGIA) ---
        refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={['#007bff']} // Color de la ruedita en Android
                tintColor={theme === 'dark' ? '#fff' : '#000'} // iOS
            />
        }

        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.nameWrapper}
              onPress={() =>
                navigation.navigate('PersonDetail', { personId: item.id })
              }
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text
                style={{
                  fontSize: 14,
                  color: (item.currentBalance || 0) < 0 ? '#ff4444' : '#4caf50',
                  fontWeight: 'bold',
                }}
              >
                {(item.currentBalance || 0) < 0 ? 'Deuda: ' : 'Saldo: '}
                ₡{Math.abs(item.currentBalance || 0).toFixed(2)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await toggleFavorite(item.id);
                } catch (error) {
                  console.error('Error al cambiar favorito:', error);
                }
              }}
            >
              <Ionicons
                name={item.isFavorite ? 'star' : 'star-outline'}
                size={24}
                color={
                  item.isFavorite
                    ? '#f0c420'
                    : theme === 'dark'
                    ? '#aaa'
                    : '#888'
                }
              />
            </TouchableOpacity>
          </View>
        )}
      />
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
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16,
      color: theme === 'dark' ? '#fff' : '#000',
    },
    input: {
      borderWidth: 1,
      borderColor: theme === 'dark' ? '#555' : '#ccc',
      borderRadius: 6,
      padding: 10,
      marginBottom: 16,
      color: theme === 'dark' ? '#fff' : '#000',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomColor: theme === 'dark' ? '#444' : '#ddd',
      borderBottomWidth: 1,
    },
    nameWrapper: { flex: 1 },
    name: {
      fontSize: 20,
      fontWeight: '600',
      color: theme === 'dark' ? '#fff' : '#000',
    },
  });