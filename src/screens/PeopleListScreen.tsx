// src/screens/PeopleListScreen.tsx
import React, { useContext } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { DataContext } from '../context/DataContext';

export default function PeopleListScreen() {
  const dataContext = useContext(DataContext);
  if (!dataContext) throw new Error('DataContext no encontrado');

  const { persons } = dataContext;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista de Personas</Text>
      <FlatList
        data={persons}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.item}>{item.name} - {item.type}</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  item: { fontSize: 18, marginVertical: 6 },
});
