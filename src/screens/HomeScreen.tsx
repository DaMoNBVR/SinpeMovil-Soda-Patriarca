import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { role, username, logout } = useAuth();
  const isDark = theme === 'dark';

  const styles = getStyles(isDark);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* Encabezado de Bienvenida */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hola,</Text>
          <Text style={styles.usernameText}>{username}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color={isDark ? '#ff6b6b' : '#d32f2f'} />
        </TouchableOpacity>
      </View>

      {/* --- SECCIÓN PRINCIPAL: OPERACIONES DIARIAS --- */}
      <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
      
      <View style={styles.grid}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: '#4caf50' }]}
          onPress={() => navigation.navigate('RegisterPurchase')}
        >
          <Ionicons name="cart" size={32} color="#fff" />
          <Text style={styles.cardText}>Nueva Compra</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, { backgroundColor: '#2196f3' }]}
          onPress={() => navigation.navigate('RegisterPayment')}
        >
          <Ionicons name="cash" size={32} color="#fff" />
          <Text style={styles.cardText}>Nuevo Pago</Text>
        </TouchableOpacity>
      </View>

      {/* --- SECCIÓN DE CONSULTAS --- */}
      <Text style={styles.sectionTitle}>Consultas</Text>
      
      <TouchableOpacity
        style={styles.fullWidthBtn}
        onPress={() => navigation.navigate('PeopleList')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="people" size={24} color={isDark ? '#fff' : '#333'} style={{ marginRight: 10 }} />
          <Text style={styles.btnText}>Listado de Clientes</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={isDark ? '#666' : '#ccc'} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.fullWidthBtn}
        onPress={() => navigation.navigate('FinancialSummary', { mode: 'daily' })} // Por defecto enviamos daily, luego el toggle cambia
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="stats-chart" size={24} color={isDark ? '#fff' : '#333'} style={{ marginRight: 10 }} />
          <Text style={styles.btnText}>Resumen Financiero</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={isDark ? '#666' : '#ccc'} />
      </TouchableOpacity>


      {/* --- SECCIÓN DE ADMINISTRACIÓN (Solo si es necesario o para todos según tu lógica) --- */}
      <Text style={styles.sectionTitle}>Administración</Text>

      <View style={styles.grid}>
        <TouchableOpacity
          style={[styles.card, styles.adminCard]}
          onPress={() => navigation.navigate('ManagePeople')}
        >
          <Ionicons name="person-add" size={28} color={isDark ? '#fff' : '#333'} />
          <Text style={[styles.cardText, { color: isDark ? '#fff' : '#333', marginTop: 5 }]}>Gestionar Personas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.adminCard]}
          onPress={() => navigation.navigate('ManualAdjustment')}
        >
          <Ionicons name="build" size={28} color={isDark ? '#fff' : '#333'} />
          <Text style={[styles.cardText, { color: isDark ? '#fff' : '#333', marginTop: 5 }]}>Ajuste Manual</Text>
        </TouchableOpacity>
        
        {/* Solo mostrar Crear Usuario si es Admin (opcional) */}
        {role === 'admin' && (
             <TouchableOpacity
             style={[styles.card, styles.adminCard]}
             onPress={() => navigation.navigate('RegisterUser')}
           >
             <Ionicons name="key" size={28} color={isDark ? '#fff' : '#333'} />
             <Text style={[styles.cardText, { color: isDark ? '#fff' : '#333', marginTop: 5 }]}>Crear Usuario</Text>
           </TouchableOpacity>
        )}
      </View>

    </ScrollView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#121212' : '#f5f5f5',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: isDark ? '#aaa' : '#666',
  },
  usernameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: isDark ? '#fff' : '#333',
  },
  logoutBtn: {
    padding: 10,
    backgroundColor: isDark ? '#2a2a2a' : '#fff',
    borderRadius: 50,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#fff' : '#444',
    marginBottom: 15,
    marginTop: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  adminCard: {
    backgroundColor: isDark ? '#333' : '#fff',
    borderWidth: 1,
    borderColor: isDark ? '#444' : '#eee',
  },
  cardText: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  fullWidthBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDark ? '#333' : '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#fff' : '#333',
  }
});