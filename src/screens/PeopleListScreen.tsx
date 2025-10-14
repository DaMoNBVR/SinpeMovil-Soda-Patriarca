import React, { useContext, useState } from 'react';
import { commonStyles } from '../Styles/commonStyles';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
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

  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { persons, toggleFavorite } = context;

  const filteredPersons = persons
    .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });

  const styles = getStyles(theme);

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
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.nameWrapper}
              onPress={() =>
                navigation.navigate('PersonDetail', { personId: item.id })
              }
            >
              <Text style={styles.name}>{item.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await toggleFavorite(item.id);
                } catch (error) {
                  console.error('Error al cambiar favorito:', error);
                  Alert.alert('Error', 'No se pudo actualizar el estado de favorito.');
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
      fontWeight: "600",
      color: theme === 'dark' ? '#fff' : '#000',
    },
  });
