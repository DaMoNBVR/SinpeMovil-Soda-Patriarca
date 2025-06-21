import React, { ReactElement } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function HomeButton({
  icon,
  label,
  onPress,
}: {
  icon: ReactElement;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      {icon}
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007bff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '45%',
    margin: 8,
  },
  label: {
    marginTop: 8,
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
