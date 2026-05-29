import './global.css';


import { useEffect, useState } from 'react';
import { ENV } from './env.generated';
import { Text, View, ActivityIndicator, FlatList, TextInput, TouchableOpacity } from 'react-native';

export default function App() {
  const [tasks, setTasks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [creatingSection, setCreatingSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTasks = (pwd: string) => {
    setLoading(true);
    setError(null);
    setSuccessMsg('');
    fetch(`${ENV.API_URL}/tasks?password=${encodeURIComponent(pwd)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setTasks(null);
        } else {
          setTasks(data.tasks);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const createSection = () => {
    setLoading(true);
    setError(null);
    setSuccessMsg('');
    fetch(`${ENV.API_URL}/create-section`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSuccessMsg('Section créée ! Connectez-vous avec ce mot de passe.');
          setCreatingSection(false);
          setPassword(newPassword);
          setNewPassword('');
        } else {
          setError(data.error || 'Erreur lors de la création');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  // Optionnel : auto-fetch si password par défaut (pour dev)
  // useEffect(() => { if (password) fetchTasks(password); }, [password]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        padding: 24,
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: '600', color: '#111111', marginBottom: 24 }}>
        Liste des tâches
      </Text>
      {creatingSection ? (
        <View style={{ marginBottom: 16, width: 300 }}>
          <Text style={{ marginBottom: 4, color: '#222' }}>Créer une section (mot de passe) :</Text>
          <TextInput
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={{
              width: '100%',
              padding: 8,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: '#ccc',
              marginBottom: 8
            }}
            placeholder="Nouveau mot de passe"
          />
          <TouchableOpacity
            onPress={createSection}
            style={{
              padding: 8,
              borderRadius: 4,
              backgroundColor: loading || !newPassword ? '#888' : '#111',
              alignItems: 'center',
              width: '100%'
            }}
            disabled={loading || !newPassword}
          >
            <Text style={{ color: '#fff' }}>Valider</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setCreatingSection(false); setNewPassword(''); setError(null); setSuccessMsg(''); }}
            style={{
              marginTop: 8,
              padding: 8,
              borderRadius: 4,
              backgroundColor: '#eee',
              alignItems: 'center',
              width: '100%'
            }}
            disabled={loading}
          >
            <Text style={{ color: '#111' }}>Annuler</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ marginBottom: 16, width: 300 }}>
          <Text style={{ marginBottom: 4, color: '#222' }}>Mot de passe :</Text>
          <TextInput
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={{
              width: '100%',
              padding: 8,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: '#ccc',
              marginBottom: 8
            }}
            placeholder="Entrer le mot de passe"
          />
          <TouchableOpacity
            onPress={() => fetchTasks(password)}
            style={{
              padding: 8,
              borderRadius: 4,
              backgroundColor: loading || !password ? '#888' : '#111',
              alignItems: 'center',
              width: '100%'
            }}
            disabled={loading || !password}
          >
            <Text style={{ color: '#fff' }}>Charger les tâches</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setCreatingSection(true); setError(null); setSuccessMsg(''); }}
            style={{
              marginTop: 8,
              padding: 8,
              borderRadius: 4,
              backgroundColor: '#eee',
              alignItems: 'center',
              width: '100%'
            }}
            disabled={loading}
          >
            <Text style={{ color: '#111' }}>Créer une section</Text>
          </TouchableOpacity>
        </View>
      )}
      {loading && <ActivityIndicator size="large" color="#111111" />}
      {successMsg && <Text style={{ color: 'green', marginBottom: 8 }}>{successMsg}</Text>}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      {tasks && (
        <FlatList
          data={tasks}
          keyExtractor={(item, index) => item.title || index.toString()}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 12, padding: 12, backgroundColor: '#f2f2f2', borderRadius: 8, width: 300 }}>
              <Text style={{ fontSize: 18, color: '#222', marginBottom: 4 }}>{item.title}</Text>
              <Text style={{ color: item.completed ? 'green' : 'orange', marginBottom: 4 }}>
                {item.completed ? 'Terminée' : 'À faire'}
              </Text>
              <Text style={{ color: '#555', marginBottom: 4 }}>
                Difficulté : {typeof item.difficulity === 'number' ? item.difficulity : 'N/A'} / 10
              </Text>
              <Text style={{ color: '#555' }}>
                Fin : {item.endDate ? new Date(item.endDate).toLocaleString() : 'Non définie'}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
