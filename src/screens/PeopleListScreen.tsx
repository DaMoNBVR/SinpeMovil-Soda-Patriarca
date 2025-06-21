import React, { useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { DataContext } from '../context/DataContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function PeopleListScreen() {
  const context = useContext(DataContext);
  const navigation = useNavigation<any>();

  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { persons, toggleFavorite } = context;

  // Ordenar: favoritos primero, luego alfabéticamente
  const sortedPersons = [...persons].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Personas</Text>
      <FlatList
        data={sortedPersons}
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
            <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
              <Ionicons
                name={item.isFavorite ? 'star' : 'star-outline'}
                size={24}
                color={item.isFavorite ? '#f0c420' : '#888'}
              />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  nameWrapper: { flex: 1 },
  name: { fontSize: 18 },
});