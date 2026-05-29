import './global.css';


import { useEffect, useState } from 'react';
import { ENV } from './env.generated';
import { Text, View, ActivityIndicator, FlatList } from 'react-native';

export default function App() {
  const [tasks, setTasks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${ENV.API_URL}/tasks`)
      .then((res) => {
        if (!res.ok) throw new Error('Erreur lors du chargement');
        return res.json();
      })
      .then((data) => {
        setTasks(data.tasks);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

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
      {loading && <ActivityIndicator size="large" color="#111111" />}
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
