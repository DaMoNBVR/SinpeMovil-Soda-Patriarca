import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Switch } from 'react-native';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import { commonStyles } from '../Styles/commonStyles';

export default function RegisterUserScreen() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const styles = getStyles(isDark);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    const handleRegister = async () => {
        if (!username || !password) {
            Alert.alert('Error', 'Debe ingresar usuario y contraseña');
            return;
        }

        try {
            // Check if user exists
            const q = query(collection(db, 'users'), where('username', '==', username));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                Alert.alert('Error', 'El usuario ya existe');
                return;
            }

            await addDoc(collection(db, 'users'), {
                username,
                password,
                role: isAdmin ? 'admin' : 'employee'
            });
            Alert.alert('Éxito', 'Usuario creado correctamente');
            setUsername('');
            setPassword('');
            setIsAdmin(false);

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo crear el usuario');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={[commonStyles.title, { color: isDark ? '#fff' : '#000' }]}>Crear Nuevo Usuario</Text>

            <Text style={styles.label}>Usuario:</Text>
            <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Nombre de usuario"
                placeholderTextColor={isDark ? '#aaa' : '#666'}
            />

            <Text style={styles.label}>Contraseña:</Text>
            <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña"
                placeholderTextColor={isDark ? '#aaa' : '#666'}
                secureTextEntry
            />

            <View style={styles.switchRow}>
                <Text style={styles.label}>Es Administrador? </Text>
                <Switch value={isAdmin} onValueChange={setIsAdmin} />
            </View>

            <Button title="Crear Usuario" onPress={handleRegister} />
        </View>
    );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: isDark ? '#121212' : '#fff' },
    label: { fontSize: 18, marginBottom: 6, color: isDark ? '#fff' : '#000' },
    input: {
        borderWidth: 1, borderColor: isDark ? '#555' : '#aaa', borderRadius: 4,
        padding: 10, marginBottom: 12, color: isDark ? '#fff' : '#000', fontSize: 16
    },
    switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'center',    
    width: '100%',             
    marginBottom: 20,
    paddingVertical: 10, 
    },
});
