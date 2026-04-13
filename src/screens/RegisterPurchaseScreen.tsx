import React, { useContext, useState, useMemo } from 'react';
import { commonStyles } from '../Styles/commonStyles';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { DataContext } from '../context/DataContext';
import { Purchase } from '../models';
import uuid from 'react-native-uuid';
import { useTheme } from '../context/ThemeContext';
import { normalizeText } from '../utils/stringUtils';

export default function RegisterPurchaseScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const context = useContext(DataContext);
  if (!context) return <Text>Error: DataContext no disponible</Text>;

  const { persons, addPurchase } = context;

  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  
  // --- FRENO DE MANO PARA EVITAR DUPLICADOS ---
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ALERTA TEMPRANA AL SELECCIONAR CLIENTE ---
  const handleSelectPerson = (person: any) => {
    // 1. Seleccionamos al cliente en la UI y cerramos la lista
    setSelectedPersonId(person.id);
    setInputFocused(false);
    setSearch('');

    // 2. Disparamos la alerta de inmediato si está bloqueado y sin saldo
    if (person.allowCredit === false && (person.currentBalance || 0) <= 0) {
      Alert.alert(
        '🛑 Fiar Bloqueado',
        `¡Alto! ${person.name} NO tiene permiso para fiar y su saldo actual es ₡${person.currentBalance || 0}.\n\nCóbrele en efectivo o dígale que abone dinero antes de darle el producto.`,
        [{ text: 'Entendido', style: 'destructive' }]
      );
    }
  };

  const selectedPerson = persons.find((p) => p.id === selectedPersonId);

  // Búsqueda instantánea en memoria (optimizado con useMemo)
  const filteredPersons = useMemo(() => {
    if (!search) return persons; // (O uniquePersons, dependiendo de la pantalla)
        
        // 1. Normalizamos la búsqueda (quitamos tildes y mayúsculas)
        const query = normalizeText(search);
        
        // 2. Dividimos la búsqueda en palabras separadas por espacios.Ejemplo: "teo jas" se convierte en el arreglo ["teo", "jas"]
        const searchWords = query.split(' ').filter(word => word.length > 0);
        
        return persons.filter(p => {
            // 3. Unimos todo el texto de la persona en un solo gran bloque de texto
            const personName = normalizeText(p.name);
            const guardName = normalizeText(p.guardianName);
            const fullTextToSearch = `${personName} ${guardName}`;
            
            // 4.Verificamos que TODAS las palabras que el usuario escribió estén incluidas en alguna parte de ese bloque de texto.
            return searchWords.every(word => fullTextToSearch.includes(word));
        });
      }, [persons, search]);

  const handleRegisterPurchase = async () => {
    if (isSubmitting) return;

    if (!selectedPersonId || !selectedPerson) {
      Alert.alert('Error', 'Selecciona una persona');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Monto inválido');
      return;
    }


    const now = new Date();
    const localISO = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, -1);
    // --- FUNCIÓN INTERNA PARA EJECUTAR EL GUARDADO ---
    // La definimos aquí para usarla en la validación normal o en la excepción
    const executePurchase = async () => {
      setIsSubmitting(true);
      const newPurchase: Purchase = {
        id: uuid.v4() as string,
        personId: selectedPersonId,
        amount: parsedAmount,
        date: localISO,
        description: description.trim(),
      };

      try {
        await addPurchase(newPurchase);
        Alert.alert('Éxito', 'Compra registrada');
        setAmount('');
        setDescription('');
        setSelectedPersonId('');
        setSearch('');
        setInputFocused(false);
      } catch (error) {
        console.error('Error al registrar compra:', error);
        Alert.alert('Error', 'No se pudo registrar la compra.');
      } finally {
        setIsSubmitting(false);
      }
    };

    // --- LÓGICA DE VALIDACIÓN CON EXCEPCIÓN ---
    const currentBalance = selectedPerson.currentBalance || 0;
    const finalBalance = currentBalance - parsedAmount;

    if (selectedPerson.allowCredit === false && finalBalance < 0) {
      // ⚠️ CASO DE EXCEPCIÓN: Mostramos dos botones
      Alert.alert(
        '⚠️ Restricción de Crédito',
        `Este estudiante tiene el crédito desactivado.\n\n` +
        `Saldo actual: ₡${currentBalance}\n` +
        `Faltan: ₡${Math.abs(finalBalance)}\n\n` +
        `¿Desea autorizar esta compra como una excepción?`,
        [
          { text: 'No, cancelar', style: 'cancel' },
          { 
            text: 'Sí, autorizar', 
            style: 'destructive', // Color rojo para que sepan que es algo delicado
            onPress: () => executePurchase() // Si dicen que sí, disparamos el guardado
          }
        ]
      );
      return; // Detenemos el flujo principal para esperar la decisión del Alert
    }

    // Si el cliente TIENE crédito o el saldo es suficiente, procedemos directo
    executePurchase();
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { fontSize: 18 }]}>Buscar persona:</Text>

      {selectedPerson ? (
        <View style={styles.selectedRow}>
          <Text style={[styles.selected, {color: theme === 'dark' ? '#81c784' : 'green'}]}>
            Seleccionado: {selectedPerson.name}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSelectedPersonId('');
              setInputFocused(true);
            }}
          >
            <Text style={styles.changeBtn}>✏️ Cambiar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput
            style={[styles.input, { fontSize: 18 }]}
            placeholder="Nombre o inicial"
            placeholderTextColor={theme === 'dark' ? '#aaa' : undefined}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setInputFocused(true)}
          />
          {inputFocused && search.length > 0 && (
            <FlatList
              data={filteredPersons}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 150 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handleSelectPerson(item)}
                >
                  <Text style={[commonStyles.itemText, { color: theme === 'dark' ? '#fff' : '#000' }]}>
                    {item.name} {item.isFavorite ? '⭐' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}

      {selectedPerson && (
         <Text style={{ 
             textAlign: 'center', 
             marginBottom: 10, 
             fontWeight: 'bold',
             fontSize: 16,
             color: (selectedPerson.currentBalance || 0) < 0 ? '#ff4444' : '#4caf50'
         }}>
            Saldo actual: ₡{selectedPerson.currentBalance || 0}
         </Text>
      )}

      <Text style={[styles.label, { fontSize: 18 }]}>Monto:</Text>
      <TextInput
        style={[styles.input, { fontSize: 18 }]}
        placeholder="Monto en colones"
        placeholderTextColor={theme === 'dark' ? '#aaa' : undefined}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={[styles.label, { fontSize: 18 }]}>Descripción (opcional):</Text>
      <TextInput
        style={[styles.input, { fontSize: 18 }]}
        placeholder="Descripción"
        placeholderTextColor={theme === 'dark' ? '#aaa' : undefined}
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity
        style={[
            styles.button, 
            isSubmitting && { opacity: 0.6 } 
        ]}
        onPress={handleRegisterPurchase}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
            <ActivityIndicator color="#fff" />
        ) : (
            <Text style={styles.buttonText}>Registrar Compra</Text>
        )}
      </TouchableOpacity>
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
    label: {
      marginTop: 10,
      marginBottom: 5,
      color: theme === 'dark' ? '#fff' : '#000',
    },
    input: {
      borderWidth: 1,
      borderColor: theme === 'dark' ? '#666' : '#aaa',
      borderRadius: 4,
      padding: 10,
      marginBottom: 10,
      color: theme === 'dark' ? '#fff' : '#000',
    },
    selectedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      padding: 10,
      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f0f0f0',
      borderRadius: 8
    },
    selected: {
      fontStyle: 'italic',
      fontWeight: 'bold'
    },
    changeBtn: {
      color: '#007bff',
      fontWeight: 'bold',
    },
    item: {
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderColor: theme === 'dark' ? '#444' : '#ddd',
      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#fafafa'
    },
    button: {
        backgroundColor: '#007bff',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    }
  });