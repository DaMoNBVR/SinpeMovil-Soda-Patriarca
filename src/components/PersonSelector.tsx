// src/components/PersonSelector.tsx
import React, { useState } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Person } from '../models';

interface Props {
  persons: Person[];
  onSelect: (personId: string) => void;
}

export default function PersonSelector({ persons, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const filtered = persons
    .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Buscar persona"
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          if (!dropdownVisible) setDropdownVisible(true);
        }}
        onFocus={() => setDropdownVisible(true)}
        style={styles.input}
      />

      {dropdownVisible && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          style={styles.dropdown}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                onSelect(item.id);
                setQuery(item.name);
                setDropdownVisible(false);
              }}
              style={styles.item}
            >
              <Text>{item.name}{item.isFavorite ? ' ⭐' : ''}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { zIndex: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 4,
    padding: 8,
    marginBottom: 5,
  },
  dropdown: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 4,
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
