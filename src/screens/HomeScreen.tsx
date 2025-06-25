import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

type ButtonProps = {
  icon: React.ReactElement;
  label: string;
  onPress: () => void;
};

function HomeButton({ icon, label, onPress }: ButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themedStyles = createStyles(isDark);

  return (
    <TouchableOpacity style={themedStyles.button} onPress={onPress}>
      {icon}
      <Text style={themedStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { logout } = useAuth(); // ⬅️ Asegúrate de tener esto
  const themedStyles = createStyles(isDark);

  const handleLogout = () => {
    logout();
  };

  return (
    <ScrollView contentContainerStyle={themedStyles.container}>
      <Text style={themedStyles.title}>Bienvenido</Text>

      <View style={themedStyles.buttonGrid}>
        <HomeButton
          icon={<Ionicons name="cart" size={32} color="white" />}
          label="Registrar Compra"
          onPress={() => navigation.navigate('RegisterPurchase')}
        />
        <HomeButton
          icon={<Ionicons name="cash" size={32} color="white" />}
          label="Registrar Pago"
          onPress={() => navigation.navigate('RegisterPayment')}
        />
        <HomeButton
          icon={<Ionicons name="calendar" size={32} color="white" />}
          label="Resumen Diario"
          onPress={() => navigation.navigate('DailySummary')}
        />
        <HomeButton
          icon={<Ionicons name="calendar-outline" size={32} color="white" />}
          label="Resumen Semanal"
          onPress={() => navigation.navigate('WeeklySummary')}
        />
        <HomeButton
          icon={<Ionicons name="people" size={32} color="white" />}
          label="Personas"
          onPress={() => navigation.navigate('PeopleList')}
        />
        <HomeButton
          icon={<Ionicons name="stats-chart" size={32} color="white" />}
          label="Balance General"
          onPress={() => navigation.navigate('GeneralBalance')}
        />
        <HomeButton
          icon={<Ionicons name="build" size={32} color="white" />}
          label="Ajustes Manuales"
          onPress={() => navigation.navigate('ManualAdjustment')}
        />
        <HomeButton
          icon={<Ionicons name="person-add" size={32} color="white" />}
          label="Gestionar personas"
          onPress={() => navigation.navigate('ManagePeople')}
        />
      </View>

      <TouchableOpacity onPress={toggleTheme} style={themedStyles.toggle}>
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={isDark ? 'white' : 'black'} />
        <Text style={themedStyles.toggleText}>
          Cambiar a modo {isDark ? 'claro' : 'oscuro'}
        </Text>
      </TouchableOpacity>

      {/* Botón de cerrar sesión */}
      <TouchableOpacity onPress={handleLogout} style={themedStyles.logoutButton}>
        <Ionicons name="log-out-outline" size={24} color="white" />
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(isDark: boolean) {
  const buttonColor = '#00aaff';

  return StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 20,
      backgroundColor: isDark ? '#111' : '#fff',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      color: isDark ? '#fff' : '#000',
    },
    buttonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    button: {
      width: '48%',
      backgroundColor: buttonColor,
      paddingVertical: 20,
      paddingHorizontal: 10,
      borderRadius: 10,
      marginBottom: 16,
      alignItems: 'center',
    },
    label: {
      marginTop: 10,
      fontSize: 16,
      color: 'white',
      textAlign: 'center',
    },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 30,
      justifyContent: 'center',
    },
    toggleText: {
      marginLeft: 10,
      color: isDark ? '#fff' : '#000',
    },
    logoutButton: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      backgroundColor: '#e74c3c',
      padding: 12,
      borderRadius: 30,
      elevation: 4,
    },
  });
}
