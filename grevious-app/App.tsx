import DateTimePicker from '@react-native-community/datetimepicker';
import './styles.js';

import { useEffect, useRef, useState } from 'react';
import { ENV } from './env.generated';

import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function App() {
  // ---------------- STATE ----------------
  const [tasks, setTasks] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [editForm, setEditForm] = useState({
    title: '',
    difficulity: 1,
    endDate: null as string | null,
    completed: false,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [localSecret, setLocalSecret] = useState<string | null>(null);

  const [creatingSection, setCreatingSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const lastTap = useRef(0);

  // ---------------- INIT ----------------
  useEffect(() => {
    const secret =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('grevious_secret')
        : null;

    if (secret) {
      setLocalSecret(secret);
      setPassword(secret);
      fetchTasks(secret);
    }
  }, []);

  useEffect(() => {
    if (localSecret && typeof window !== 'undefined') {
      window.localStorage.setItem('grevious_secret', localSecret);
    }
  }, [localSecret]);

  // ---------------- SORT ----------------
  const sortTasks = (arr: any[]) => {
    if (!Array.isArray(arr)) return [];

    return [...arr].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;

      const aDate = a.endDate ? new Date(a.endDate).getTime() : null;
      const bDate = b.endDate ? new Date(b.endDate).getTime() : null;

      if (aDate && bDate) return aDate - bDate;
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;

      return (b.difficulity || 0) - (a.difficulity || 0);
    });
  };

  // ---------------- FETCH ----------------
  const fetchTasks = async (pwd: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${ENV.API_URL}/tasks?password=${encodeURIComponent(pwd)}`
      );
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setTasks([]);
        return;
      }

      setTasks(sortTasks(data.tasks || []));
      setLocalSecret(pwd);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- SECTION ----------------
  const createSection = async () => {
    if (!newPassword) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${ENV.API_URL}/create-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();

      if (data.success) {
        setLocalSecret(newPassword);
        setPassword(newPassword);
        setCreatingSection(false);
        fetchTasks(newPassword);
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- EDIT ACTIONS ----------------
  const openEdit = (item: any, index: number) => {
    setEditingIndex(index);
    setEditForm({
      title: item.title,
      difficulity: item.difficulity || 1,
      endDate: item.endDate || null,
      completed: !!item.completed,
    });
  };

  const closeEdit = () => setEditingIndex(null);

  const saveEdit = async () => {
    if (editingIndex === null || !localSecret) return;
    setLoading(true);

    try {
      const res = await fetch(`${ENV.API_URL}/task`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: localSecret,
          index: editingIndex,
          updates: editForm,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTasks(prev => {
          const copy = [...prev];
          copy[editingIndex] = { ...copy[editingIndex], ...editForm };
          return sortTasks(copy);
        });
        setEditingIndex(null);
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompleteExpress = async (item: any, index: number) => {
    if (!localSecret) return;
    const updatedStatus = !item.completed;
    
    setTasks(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], completed: updatedStatus };
      return sortTasks(copy);
    });

    try {
      await fetch(`${ENV.API_URL}/task`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: localSecret,
          index,
          updates: { ...item, completed: updatedStatus },
        }),
      });
    } catch (e) {
      fetchTasks(localSecret);
    }
  };

  const deleteTask = async () => {
    if (editingIndex === null || !localSecret) return;
    setLoading(true);

    try {
      const res = await fetch(`${ENV.API_URL}/task`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: localSecret,
          index: editingIndex,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTasks(prev => prev.filter((_, i) => i !== editingIndex));
        setEditingIndex(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (!localSecret) return;

    const newTask = {
      title: 'Nouvelle tâche',
      completed: false,
      difficulity: 1,
      endDate: null,
      createdAt: new Date().toISOString(),
    };

    setTasks(prev => sortTasks([newTask, ...prev]));

    await fetch(`${ENV.API_URL}/task`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: localSecret,
        index: -1,
        updates: newTask,
        insert: true,
      }),
    });
  };

  const handleTap = (item: any, index: number) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      openEdit(item, index);
    } else {
      toggleCompleteExpress(item, index);
    }
    lastTap.current = now;
  };

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEditForm(f => ({ ...f, endDate: selectedDate.toISOString().split('T')[0] }));
    }
  };

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  return (
    <View className="container">
      {/* HEADER */}
      <View className="header">
        <Text className="header-title">📋 Tasks</Text>
        {localSecret && (
          <TouchableOpacity onPress={addTask} className="btn-add">
            <Text className="btn-add-text">+</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={{ color: '#ef4444', marginBottom: 12, fontWeight: '600' }}>⚠️ {error}</Text>}
      {loading && <ActivityIndicator color="#4f46e5" style={{ marginBottom: 12 }} />}

      {/* LOGIN / CONNEXION */}
      {!localSecret ? (
        <View className="auth-card">
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mot de passe de votre section"
            secureTextEntry
            placeholderTextColor="#94a3b8"
            className="input-field"
          />

          <TouchableOpacity onPress={() => fetchTasks(password)} className="btn-primary">
            <Text className="btn-primary-text">Charger l'espace</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setCreatingSection(!creatingSection)}>
            <Text className="text-link">
              {creatingSection ? "Annuler" : "Créer une nouvelle section"}
            </Text>
          </TouchableOpacity>

          {creatingSection && (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nom de la nouvelle clé"
                placeholderTextColor="#94a3b8"
                className="input-field"
              />
              <TouchableOpacity onPress={createSection} className="btn-primary" style={{ backgroundColor: '#10b981' }}>
                <Text className="btn-primary-text">Générer l'espace</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View className="section-banner">
          <Text className="section-text">Clé : {localSecret}</Text>
          <TouchableOpacity onPress={() => { setLocalSecret(null); setTasks([]); }}>
            <Text className="section-logout">Déconnexion</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* LISTE DES TÂCHES */}
      <FlatList
        data={safeTasks}
        keyExtractor={(_, i) => i.toString()}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }: { item: any, index: number }) =>
          editingIndex === index ? (
            /* --- ETAT MODIFICATION --- */
            <View className="edit-card">
              <TextInput
                value={editForm.title}
                onChangeText={t => setEditForm(f => ({ ...f, title: t }))}
                className="input-field"
                style={{ marginBottom: 6 }}
              />

              {/* Ligne Difficulté */}
              <View className="edit-row">
                <Text className="inline-label">Difficulté</Text>
                <View className="difficulty-container">
                  {[1, 2, 3, 4, 5].map(num => (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setEditForm(f => ({ ...f, difficulity: num }))}
                      className={`diff-dot ${editForm.difficulity === num ? 'diff-dot-active' : ''}`}
                    >
                      <Text className={`diff-dot-text ${editForm.difficulity === num ? 'diff-dot-text-active' : ''}`}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Ligne Date de fin */}
              <View className="edit-row">
                <Text className="inline-label">Échéance</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} className="date-trigger">
                  <Text className="date-trigger-text">
                    {editForm.endDate ? editForm.endDate : 'Définir une date'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={editForm.endDate ? new Date(editForm.endDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}

              {/* Boutons d'actions du formulaire */}
              <View className="action-row">
                <TouchableOpacity onPress={deleteTask}>
                  <Text className="btn-action-text" style={{ color: '#ef4444' }}>Supprimer</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={closeEdit}>
                  <Text className="btn-action-text" style={{ color: '#64748b' }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveEdit}>
                  <Text className="btn-action-text" style={{ color: '#4f46e5' }}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* --- ETAT AFFICHAGE COMPACT --- */
            <Pressable 
              onPress={() => handleTap(item, index)} 
              onLongPress={() => openEdit(item, index)}
            >
              <View className="task-card">
                <View className="task-left">
                  {/* Case à cocher */}
                  <View className={`checkbox ${item.completed ? 'checkbox-checked' : ''}`}>
                    {item.completed && <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                  </View>
                  <Text 
                    numberOfLines={1} 
                    className={`task-title ${item.completed ? 'task-title-done' : ''}`}
                  >
                    {item.title}
                  </Text>
                </View>

                <View className="task-right">
                  {item.endDate && (
                    <Text className="task-date">
                      {item.endDate.split('-').reverse().slice(0, 2).join('/')}
                    </Text>
                  )}
                  <View className="badge-difficulty">
                    <Text className="badge-text">⭐ {item.difficulity || 1}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          )
        }
      />
    </View>
  );
}