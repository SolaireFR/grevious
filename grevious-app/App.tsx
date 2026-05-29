import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { ENV } from './env.generated';

import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
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
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Tasks</Text>
        {localSecret && (
          <TouchableOpacity onPress={addTask} style={styles.btnAdd}>
            <Text style={styles.btnAddText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>⚠️ {error}</Text>}
      {loading && <ActivityIndicator color="#4f46e5" style={{ marginBottom: 12 }} />}

      {/* LOGIN / CONNEXION */}
      {!localSecret ? (
        <View style={styles.authCard}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mot de passe de votre section"
            secureTextEntry
            placeholderTextColor="#94a3b8"
            style={styles.inputField}
          />

          <TouchableOpacity onPress={() => fetchTasks(password)} style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>Charger l'espace</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setCreatingSection(!creatingSection)}>
            <Text style={styles.textLink}>
              {creatingSection ? "Annuler" : "Créer une nouvelle section"}
            </Text>
          </TouchableOpacity>

          {creatingSection && (
            <View style={styles.authDivider}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nom de la nouvelle clé"
                placeholderTextColor="#94a3b8"
                style={styles.inputField}
              />
              <TouchableOpacity onPress={createSection} style={[styles.btnPrimary, { backgroundColor: '#10b981' }]}>
                <Text style={styles.btnPrimaryText}>Générer l'espace</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.sectionBanner}>
          <Text style={styles.sectionText}>Clé : {localSecret}</Text>
          <TouchableOpacity onPress={() => { setLocalSecret(null); setTasks([]); }}>
            <Text style={styles.sectionLogout}>Déconnexion</Text>
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
            /* --- ÉTAT MODIFICATION --- */
            <View style={styles.editCard}>
              <TextInput
                value={editForm.title}
                onChangeText={t => setEditForm(f => ({ ...f, title: t }))}
                style={[styles.inputField, { marginBottom: 6 }]}
              />

              {/* Ligne Difficulté */}
              <View style={styles.editRow}>
                <Text style={styles.inlineLabel}>Difficulté</Text>
                <View style={styles.difficultyContainer}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setEditForm(f => ({ ...f, difficulity: num }))}
                      style={[
                        styles.diffDot,
                        editForm.difficulity === num && styles.diffDotActive
                      ]}
                    >
                      <Text style={[
                        styles.diffDotText,
                        editForm.difficulity === num && styles.diffDotTextActive
                      ]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Ligne Date de fin */}
              <View style={styles.editRow}>
                <Text style={styles.inlineLabel}>Échéance</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateTrigger}>
                  <Text style={styles.dateTriggerText}>
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
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={deleteTask}>
                  <Text style={[styles.btnActionText, { color: '#ef4444' }]}>Supprimer</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={closeEdit}>
                  <Text style={[styles.btnActionText, { color: '#64748b' }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveEdit}>
                  <Text style={[styles.btnActionText, { color: '#4f46e5' }]}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* --- ÉTAT AFFICHAGE COMPACT --- */
            <Pressable 
              onPress={() => handleTap(item, index)} 
              onLongPress={() => openEdit(item, index)}
            >
              <View style={styles.taskCard}>
                <View style={styles.taskLeft}>
                  {/* Case à cocher */}
                  <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
                    {item.completed && <Text style={styles.checkboxCheckmark}>✓</Text>}
                  </View>
                  <Text 
                    numberOfLines={1} 
                    style={[styles.taskTitle, item.completed && styles.taskTitleDone]}
                  >
                    {item.title}
                  </Text>
                </View>

                <View style={styles.taskRight}>
                  {item.endDate && (
                    <Text style={styles.taskDate}>
                      {item.endDate.split('-').reverse().slice(0, 2).join('/')}
                    </Text>
                  )}
                  <View style={styles.badgeDifficulty}>
                    <Text style={styles.badgeText}>⭐ {item.difficulity || 1}</Text>
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

// ---------------- STYLES NATIFS REACT NATIVE ----------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  errorText: {
    color: '#ef4444', 
    marginBottom: 12, 
    fontWeight: '600'
  },
  btnPrimary: {
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  btnAdd: {
    backgroundColor: '#4f46e5',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  btnAddText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '300',
    marginTop: -2,
  },
  authCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  inputField: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textLink: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 12,
    textDecorationLine: 'underline',
  },
  authDivider: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  sectionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  sectionText: {
    color: '#0369a1',
    fontWeight: '600',
    fontSize: 13,
  },
  sectionLogout: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 13,
  },
  taskCard: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkboxCheckmark: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  taskRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeDifficulty: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  taskDate: {
    fontSize: 12,
    color: '#64748b',
  },
  editCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  inlineLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  difficultyContainer: {
    flexDirection: 'row',
  },
  diffDot: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  diffDotActive: {
    backgroundColor: '#6366f1',
  },
  diffDotText: {
    fontSize: 12,
    color: '#475569',
  },
  diffDotTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dateTrigger: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  dateTriggerText: {
    fontSize: 12,
    color: '#475569',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  btnActionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 16,
  },
});