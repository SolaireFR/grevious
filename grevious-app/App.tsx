import './global.css';


import { useEffect, useState } from 'react';
import { Text, View, ActivityIndicator, FlatList } from 'react-native';

export default function App() {
  const [tasks, setTasks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3000/tasks')
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
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 12, padding: 12, backgroundColor: '#f2f2f2', borderRadius: 8, width: 300 }}>
              <Text style={{ fontSize: 18, color: '#222' }}>{item.title}</Text>
              <Text style={{ color: item.completed ? 'green' : 'orange' }}>
                {item.completed ? 'Terminée' : 'À faire'}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
