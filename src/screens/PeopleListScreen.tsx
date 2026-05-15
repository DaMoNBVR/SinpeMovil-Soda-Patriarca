import React, { useContext, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  RefreshControl
} from 'react-native';
import { DataContext } from '../context/DataContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { normalizeText } from '../utils/stringUtils';

export default function PeopleListScreen() {
  const context = useContext(DataContext);
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'weekly' | 'daily'>('weekly');
  const [debtFilter, setDebtFilter] = useState<'all' | '7days' | '15days'>('all');

  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { persons, toggleFavorite, refreshData, syncAllBalances } = context;

  const uniquePersons = useMemo(() => {
    const map = new Map();
    persons.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [persons]);

  const filteredPersons = uniquePersons
    .filter((p) => {
      const pType = p.paymentType || 'weekly';
      if (pType !== activeTab) return false;

      // 2. FILTRO DE MOROSIDAD (Último pago)
      if (debtFilter !== 'all') {
        // Si el cliente tiene saldo a favor o en 0, no es moroso, lo ocultamos
        if ((p.currentBalance || 0) >= 0) return false;

        // Buscamos la fecha de su último pago, si no hay, usamos la de creación de la cuenta
        const dateToCompare = p.lastPaymentDate || p.createdAt;

        // Si es un cliente MUY viejo de la base de datos que no tiene ninguna de las dos fechas,
        // lo sacamos del filtro para que no salga como "falso positivo"
        if (!dateToCompare) return false; 

        const now = new Date();
        const refDate = new Date(dateToCompare);
        const daysSinceLastEvent = (now.getTime() - refDate.getTime()) / (1000 * 3600 * 24);

        if (debtFilter === '7days' && daysSinceLastEvent <= 7) return false;
        if (debtFilter === '15days' && daysSinceLastEvent <= 15) return false;
      }

      if (!searchTerm) return true;
      
      const query = normalizeText(searchTerm);
      const searchWords = query.split(' ').filter(word => word.length > 0);
      
      const personName = normalizeText(p.name);
      const guardName = normalizeText(p.guardianName); 
      const fullTextToSearch = `${personName} ${guardName}`;
      
      return searchWords.every(word => fullTextToSearch.includes(word));
    })
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });

  const styles = getStyles(theme);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Personas</Text>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'weekly' && styles.activeTab]}
          onPress={() => setActiveTab('weekly')}
        >
          <Text style={[styles.tabText, activeTab === 'weekly' && styles.activeTabText]}>Semanales / Fijos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'daily' && styles.activeTab]}
          onPress={() => setActiveTab('daily')}
        >
          <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>⚡ SINPE Diario</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={[styles.input, { fontSize: 18 }]}
        placeholder="Buscar por nombre"
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholderTextColor={theme === 'dark' ? '#aaa' : '#666'}
      />

      <View style={{ marginBottom: 15 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, debtFilter === 'all' && styles.activeFilterChip]}
            onPress={() => setDebtFilter('all')}
          >
            <Text style={[styles.filterChipText, debtFilter === 'all' && styles.activeFilterChipText]}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, debtFilter === '7days' && styles.activeFilterChip]}
            onPress={() => setDebtFilter('7days')}
          >
            <Text style={[styles.filterChipText, debtFilter === '7days' && styles.activeFilterChipText]}>⚠️ +7 días sin pagar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, debtFilter === '15days' && styles.activeFilterChip]}
            onPress={() => setDebtFilter('15days')}
          >
            <Text style={[styles.filterChipText, debtFilter === '15days' && styles.activeFilterChipText]}>🚨 +15 días sin pagar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={filteredPersons}
        keyExtractor={(item) => item.id}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={['#007bff']} 
                tintColor={theme === 'dark' ? '#fff' : '#000'} 
            />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.nameWrapper}
              onPress={() => navigation.navigate('PersonDetail', { personId: item.id })}
            >
              <Text style={styles.name}>
                {item.paymentType === 'daily' ? '⚡ ' : ''}{item.name}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: (item.currentBalance || 0) < 0 ? '#ff4444' : '#4caf50',
                  fontWeight: 'bold',
                  marginTop: 2
                }}
              >
                {(item.currentBalance || 0) < 0 ? 'Deuda: ' : 'Saldo: '}
                ₡{Math.abs(item.currentBalance || 0).toFixed(2)}
                
                {debtFilter === 'all' && (item.currentBalance || 0) < 0 && item.lastPaymentDate && 
                  ((new Date().getTime() - new Date(item.lastPaymentDate).getTime()) / (1000 * 3600 * 24) > 15) &&
                  <Text style={{color: '#ff9800', fontStyle: 'italic'}}>  (Moroso antiguo)</Text>
                }
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
                color={item.isFavorite ? '#f0c420' : theme === 'dark' ? '#aaa' : '#888'}
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
    tabsContainer: {
      flexDirection: 'row',
      marginBottom: 15,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#007bff',
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#fff',
    },
    activeTab: {
      backgroundColor: '#007bff',
    },
    tabText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#007bff',
    },
    activeTabText: {
      color: '#fff',
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme === 'dark' ? '#555' : '#ccc',
      marginRight: 10,
      backgroundColor: theme === 'dark' ? '#222' : '#f9f9f9',
    },
    activeFilterChip: {
      backgroundColor: '#ff4444',
      borderColor: '#ff4444',
    },
    filterChipText: {
      color: theme === 'dark' ? '#ddd' : '#333',
      fontWeight: '600',
    },
    activeFilterChipText: {
      color: '#fff',
    },
    input: {
      borderWidth: 1,
      borderColor: theme === 'dark' ? '#555' : '#ccc',
      borderRadius: 6,
      padding: 10,
      marginBottom: 10,
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