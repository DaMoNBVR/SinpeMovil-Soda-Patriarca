import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/StackNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Home'>;

function HomeButton({
  icon,
  label,
  onPress,
  theme,
}: {
  icon: React.ReactElement;
  label: string;
  onPress: () => void;
  theme: 'light' | 'dark';
}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: theme === 'dark' ? '#1976d2' : '#4db6e8' },
      ]}
      onPress={onPress}
    >
      {icon}
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const { theme, toggleTheme } = useTheme();

  const backgroundColor = theme === 'dark' ? '#1e1e1e' : '#f5f5f5';
  const textColor = theme === 'dark' ? '#f2f2f2' : '#000';

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, { color: textColor }]}>Menú Principal</Text>

      <HomeButton
        icon={<MaterialCommunityIcons name="cart-outline" size={24} color="white" />}
        label="Registrar Compra"
        onPress={() => navigation.navigate('RegisterPurchase')}
        theme={theme}
      />
      <HomeButton
        icon={<MaterialCommunityIcons name="cash-plus" size={24} color="white" />}
        label="Registrar Pago"
        onPress={() => navigation.navigate('RegisterPayment')}
        theme={theme}
      />
      <HomeButton
        icon={<MaterialCommunityIcons name="account-group" size={24} color="white" />}
        label="Ver Personas"
        onPress={() => navigation.navigate('PeopleList')}
        theme={theme}
      />
      <HomeButton
        icon={<MaterialCommunityIcons name="calendar-today" size={24} color="white" />}
        label="Resumen Diario"
        onPress={() => navigation.navigate('DailySummary')}
        theme={theme}
      />
      <HomeButton
        icon={<MaterialCommunityIcons name="calendar-week" size={24} color="white" />}
        label="Resumen Semanal"
        onPress={() => navigation.navigate('WeeklySummary')}
        theme={theme}
      />
      <HomeButton
        icon={<MaterialCommunityIcons name="scale-balance" size={24} color="white" />}
        label="Balance General"
        onPress={() => navigation.navigate('GeneralBalance')}
        theme={theme}
      />

      {/* Botón de Modo Oscuro/Claro */}
      <TouchableOpacity onPress={toggleTheme} style={styles.toggleButton}>
        <MaterialCommunityIcons
          name={theme === 'dark' ? 'weather-sunny' : 'weather-night'}
          size={24}
          color="white"
        />
        <Text style={styles.toggleText}>
          {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    alignSelf: 'center',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 12,
  },
  label: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
  },
  toggleButton: {
    marginTop: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#777',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleText: {
    color: 'white',
    fontSize: 16,
  },
});
