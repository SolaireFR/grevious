import DateTimePicker from '@react-native-community/datetimepicker';
import './global.css';

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
  const [successMsg, setSuccessMsg] = useState('');

  const [localSecret, setLocalSecret] = useState<string | null>(null);

  const lastTapRef = useRef(0);

  // -----------------------
  // INIT
  // -----------------------
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
      window.localStorage.setItem(
        'grevious_secret',
        localSecret
      );
    }
  }, [localSecret]);

  // -----------------------
  // SORT TASKS
  // -----------------------
  const sortTasks = (arr: any[]) => {
    if (!Array.isArray(arr)) return [];

    return [...arr].sort((a, b) => {
      const aHasDate = !!a.endDate;
      const bHasDate = !!b.endDate;

      // priorité aux tâches avec date
      if (aHasDate && !bHasDate) return -1;
      if (!aHasDate && bHasDate) return 1;

      // tri par date la plus proche
      if (aHasDate && bHasDate) {
        return (
          new Date(a.endDate).getTime() -
          new Date(b.endDate).getTime()
        );
      }

      // sinon tri par difficulté
      return b.difficulity - a.difficulity;
    });
  };

  // -----------------------
  // FETCH
  // -----------------------
  const fetchTasks = async (pwd: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMsg('');

      const res = await fetch(
        `${ENV.API_URL}/tasks?password=${encodeURIComponent(
          pwd
        )}`
      );

      const text = await res.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          'Backend invalide (pas du JSON)'
        );
      }

      if (!data || data.error) {
        setError(data?.error || 'Erreur inconnue');
        setTasks([]);
      } else {
        setTasks(
          sortTasks(
            Array.isArray(data.tasks)
              ? data.tasks
              : []
          )
        );

        setLocalSecret(pwd);
      }
    } catch (e: any) {
      setError(e.message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------
  // OPEN EDIT
  // -----------------------
  const openEdit = (item: any, index: number) => {
    setEditingIndex(index);

    setEditForm({
      title: item.title || '',
      difficulity: item.difficulity || 1,
      endDate: item.endDate || null,
      completed: !!item.completed,
    });
  };

  const closeEdit = () => {
    setEditingIndex(null);
  };

  // -----------------------
  // SAVE
  // -----------------------
  const saveEdit = async () => {
    if (editingIndex === null || !localSecret) return;

    setLoading(true);

    try {
      const res = await fetch(
        `${ENV.API_URL}/task`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            password: localSecret,
            index: editingIndex,
            updates: editForm,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        setTasks(prev => {
          const updated = [...prev];

          updated[editingIndex] = {
            ...updated[editingIndex],
            ...editForm,
          };

          return sortTasks(updated);
        });

        setSuccessMsg('Tâche sauvegardée');
        setEditingIndex(null);
      } else {
        setError(data.error || 'Erreur');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------
  // DELETE
  // -----------------------
  const deleteTask = async () => {
    if (editingIndex === null || !localSecret) return;

    setLoading(true);

    try {
      const res = await fetch(
        `${ENV.API_URL}/task`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            password: localSecret,
            index: editingIndex,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        setTasks(prev => {
          const updated = [...prev];

          updated.splice(editingIndex, 1);

          return sortTasks(updated);
        });

        setSuccessMsg('Tâche supprimée');
        setEditingIndex(null);
      } else {
        setError(data.error || 'Erreur');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------
  // ADD TASK
  // -----------------------
  const addTask = async () => {
    if (!localSecret) return;

    setLoading(true);

    const newTask = {
      title: 'Nouvelle tâche',
      completed: false,
      difficulity: 1,
      endDate: null,
      createdAt: new Date().toISOString(),
    };

    try {
      await fetch(`${ENV.API_URL}/task`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: localSecret,
          index: -1,
          updates: newTask,
          insert: true,
        }),
      });

      setTasks(prev =>
        sortTasks([newTask, ...prev])
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------
  // DOUBLE TAP
  // -----------------------
  const handleDoubleTap = (
    item: any,
    index: number
  ) => {
    const now = Date.now();

    if (now - lastTapRef.current < 300) {
      openEdit(item, index);
    }

    lastTapRef.current = now;
  };

  // -----------------------
  // SAFE
  // -----------------------
  const safeTasks = Array.isArray(tasks)
    ? tasks
    : [];

  // -----------------------
  // UI
  // -----------------------
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#f5f7fb',
        paddingTop: 60,
        paddingHorizontal: 20,
      }}
    >
      {/* HEADER */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: '800',
            color: '#111827',
          }}
        >
          📋 Tasks
        </Text>

        {localSecret && (
          <TouchableOpacity
            onPress={addTask}
            style={{
              backgroundColor: '#6366f1',
              width: 52,
              height: 52,
              borderRadius: 999,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: 'white',
                fontSize: 28,
                fontWeight: '700',
              }}
            >
              +
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && (
        <ActivityIndicator
          size="large"
          color="#6366f1"
        />
      )}

      {!!error && (
        <Text
          style={{
            color: '#dc2626',
            marginBottom: 12,
          }}
        >
          {error}
        </Text>
      )}

      {!!successMsg && (
        <Text
          style={{
            color: '#16a34a',
            marginBottom: 12,
          }}
        >
          {successMsg}
        </Text>
      )}

      {/* LIST */}
      <FlatList
        data={safeTasks}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{
          paddingBottom: 120,
        }}
        renderItem={({ item, index }) =>
          editingIndex === index ? (
            // ========================
            // EDIT CARD
            // ========================
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 18,
                padding: 16,
                marginBottom: 12,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              {/* HEADER */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: '#111827',
                  }}
                >
                  ✏️ Édition
                </Text>

                <TouchableOpacity
                  onPress={closeEdit}
                >
                  <Text
                    style={{
                      fontSize: 20,
                      color: '#9ca3af',
                    }}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TITLE */}
              <TextInput
                value={editForm.title}
                onChangeText={t =>
                  setEditForm(f => ({
                    ...f,
                    title: t,
                  }))
                }
                placeholder="Titre"
                style={{
                  backgroundColor: '#f3f4f6',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginBottom: 10,
                }}
              />

              {/* ROW */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                {/* DIFFICULTY */}
                <TextInput
                  value={String(
                    editForm.difficulity
                  )}
                  keyboardType="numeric"
                  onChangeText={t =>
                    setEditForm(f => ({
                      ...f,
                      difficulity:
                        Number(t),
                    }))
                  }
                  placeholder="⭐"
                  style={{
                    flex: 1,
                    backgroundColor:
                      '#f3f4f6',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                />

                {/* DATE */}
                <TouchableOpacity
                  onPress={() =>
                    setShowDatePicker(true)
                  }
                  style={{
                    flex: 2,
                    backgroundColor:
                      '#f3f4f6',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    justifyContent:
                      'center',
                  }}
                >
                  <Text>
                    📅{' '}
                    {editForm.endDate
                      ? new Date(
                          editForm.endDate
                        ).toLocaleDateString()
                      : 'Date'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* PICKER */}
              {showDatePicker && (
                <DateTimePicker
                  value={
                    editForm.endDate
                      ? new Date(
                          editForm.endDate
                        )
                      : new Date()
                  }
                  mode="date"
                  display={
                    Platform.OS ===
                    'ios'
                      ? 'spinner'
                      : 'default'
                  }
                  onChange={(
                    event,
                    selectedDate
                  ) => {
                    setShowDatePicker(false);

                    if (selectedDate) {
                      setEditForm(f => ({
                        ...f,
                        endDate:
                          selectedDate.toISOString(),
                      }));
                    }
                  }}
                />
              )}

              {/* STATUS */}
              <TouchableOpacity
                onPress={() =>
                  setEditForm(f => ({
                    ...f,
                    completed:
                      !f.completed,
                  }))
                }
                style={{
                  backgroundColor:
                    editForm.completed
                      ? '#22c55e'
                      : '#f59e0b',
                  paddingVertical: 10,
                  borderRadius: 10,
                  marginBottom: 12,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: 'white',
                    fontWeight: '700',
                  }}
                >
                  {editForm.completed
                    ? '✅'
                    : '🕒'}
                </Text>
              </TouchableOpacity>

              {/* ACTIONS */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                <TouchableOpacity
                  onPress={saveEdit}
                  style={{
                    flex: 1,
                    backgroundColor:
                      '#6366f1',
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 18,
                    }}
                  >
                    💾
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={deleteTask}
                  style={{
                    flex: 1,
                    backgroundColor:
                      '#ef4444',
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 18,
                    }}
                  >
                    🗑
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // ========================
            // TASK CARD
            // ========================
            <Pressable
              onPress={() =>
                handleDoubleTap(
                  item,
                  index
                )
              }
              onLongPress={() =>
                openEdit(item, index)
              }
            >
              <View
                style={{
                  backgroundColor:
                    'white',
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: '#000',
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                {/* TOP */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent:
                      'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: '#111827',
                      flex: 1,
                    }}
                  >
                    {item.title}
                  </Text>

                  <View
                    style={{
                      backgroundColor:
                        item.completed
                          ? '#dcfce7'
                          : '#fef3c7',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                    }}
                  >
                    <Text>
                      {item.completed
                        ? '✅'
                        : '🕒'}
                    </Text>
                  </View>
                </View>

                {/* INFOS */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent:
                      'space-between',
                  }}
                >
                  <Text
                    style={{
                      color: '#6b7280',
                    }}
                  >
                    ⭐ {item.difficulity}/10
                  </Text>

                  <Text
                    style={{
                      color: '#6b7280',
                    }}
                  >
                    📅{' '}
                    {item.endDate
                      ? new Date(
                          item.endDate
                        ).toLocaleDateString()
                      : 'Aucune'}
                  </Text>
                </View>
              </View>
            </Pressable>
          )
        }
      />
    </View>
  );
}
