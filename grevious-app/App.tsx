import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { ENV } from './env.generated';

import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
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

  const [showDatePicker, setShowDatePicker] = useState<{ visible: boolean; mode: 'date' | 'time' } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [localSecret, setLocalSecret] = useState<string | null>(null);

  const [creatingSection, setCreatingSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');

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
      const res = await fetch(`${ENV.API_URL}/section`, {
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

  const closeEdit = () => {
    setEditingIndex(null);
    setShowDatePicker(null);
  };

  const saveEdit = async () => {
    if (editingIndex === null || !localSecret) return;
    setLoading(true);
    setError(null);

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

  const deleteTask = async () => {
    if (editingIndex === null || !localSecret) return;
    setLoading(true);
    setError(null);

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
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (!localSecret) return;
    setLoading(true);
    setError(null);

    const newTask = {
      title: 'Nouvelle tâche',
      completed: false,
      difficulity: 1,
      endDate: null,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${ENV.API_URL}/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: localSecret,
          task: newTask,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // On recharge depuis le serveur pour garantir l'ordre et obtenir les index réels mis à jour
        await fetchTasks(localSecret);
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- DATE PICKER CONFIG ----------------
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(null);
      return;
    }
    
    if (event.type === 'set' && selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setEditForm(f => ({ ...f, endDate: formattedDate }));
    }
    setShowDatePicker(null);
  };

  // Helper pour attribuer les couleurs selon la difficulté (1 à 5)
  const getDifficultyColor = (level: number) => {
    const colors = ['#facc15', '#f97316', '#ea580c', '#dc2626', '#b91c1c'];
    return colors[Math.min(Math.max(level - 1, 0), 4)];
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

              {/* Ligne Statut */}
              <View style={styles.editRow}>
                <Text style={styles.inlineLabel}>Marquer comme terminée</Text>
                <Switch
                  value={editForm.completed}
                  onValueChange={v => setEditForm(f => ({ ...f, completed: v }))}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                  thumbColor={Platform.OS === 'ios' ? undefined : '#ffffff'}
                />
              </View>

              {/* Ligne Difficulté */}
              <View style={styles.editRow}>
                <Text style={styles.inlineLabel}>Difficulté</Text>
                <View style={styles.difficultyContainer}>
                  {[1, 2, 3, 4, 5].map(num => {
                    const dotColor = getDifficultyColor(num);
                    const isActive = editForm.difficulity === num;
                    return (
                      <TouchableOpacity
                        key={num}
                        onPress={() => setEditForm(f => ({ ...f, difficulity: num }))}
                        style={[
                          styles.diffDot,
                          { backgroundColor: isActive ? dotColor : '#f1f5f9' }
                        ]}
                      >
                        <Text style={[
                          styles.diffDotText,
                          { color: isActive ? '#ffffff' : '#475569', fontWeight: isActive ? '700' : '400' }
                        ]}>
                          {num}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Ligne Date de fin */}
              <View style={styles.editRow}>
                <Text style={styles.inlineLabel}>Échéance</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setShowDatePicker({ visible: true, mode: 'date' })} style={styles.dateTrigger}>
                    <Text style={styles.dateTriggerText}>
                      {editForm.endDate ? editForm.endDate.split('-').reverse().join('/') : 'Définir une date'}
                    </Text>
                  </TouchableOpacity>
                  {editForm.endDate && (
                    <TouchableOpacity 
                      onPress={() => setEditForm(f => ({ ...f, endDate: null }))}
                      style={{ marginLeft: 8, padding: 4 }}
                    >
                      <Text style={{ color: '#ef4444', fontSize: 12 }}>Effacer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {showDatePicker?.visible && (
                Platform.OS === 'web' ? (
                  <TextInput
                    value={editForm.endDate || ''}
                    onChangeText={(txt) => setEditForm(f => ({ ...f, endDate: txt || null }))}
                    style={[styles.inputField, { marginTop: 10 }]}
                    // @ts-ignore
                    type="date" 
                  />
                ) : (
                  <DateTimePicker
                    value={editForm.endDate ? new Date(editForm.endDate) : new Date()}
                    mode={showDatePicker.mode}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => handleDateChange(event, date)}
                  />
                )
              )}

              {/* Boutons d'actions */}
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
            <Pressable onPress={() => openEdit(item, index)}>
              <View style={[styles.taskCard, item.completed && styles.taskCardDone]}>
                <View style={styles.taskLeft}>
                  <View 
                    style={[
                      styles.difficultyIndicator, 
                      { backgroundColor: item.completed ? '#cbd5e1' : getDifficultyColor(item.difficulity || 1) }
                    ]} 
                  />
                  <Text 
                    numberOfLines={1} 
                    style={[styles.taskTitle, item.completed && styles.taskTitleDone]}
                  >
                    {item.title}
                  </Text>
                </View>

                <View style={styles.taskRight}>
                  {item.endDate && (
                    <Text style={[styles.taskDate, item.completed && styles.disabledText]}>
                      📅 {item.endDate.split('-').reverse().slice(0, 2).join('/')}
                    </Text>
                  )}
                  {item.completed && (
                    <View style={styles.badgeDone}>
                      <Text style={styles.badgeDoneText}>Fait</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          )
        }
      />
    </View>
  );
}

// ---------------- STYLES ----------------
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
  taskCardDone: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  difficultyIndicator: {
    width: 6,
    height: 24,
    borderRadius: 3,
    marginRight: 14,
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
  taskDate: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  disabledText: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  badgeDone: {
    backgroundColor: '#d1fae5',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginLeft: 10,
  },
  badgeDoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
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
    marginTop: 12,
  },
  inlineLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  difficultyContainer: {
    flexDirection: 'row',
  },
  diffDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  diffDotText: {
    fontSize: 12,
  },
  dateTrigger: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateTriggerText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  btnActionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 16,
  },
});