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
  const [successMsg, setSuccessMsg] = useState('');

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
    setLoading(true);

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

  // ---------------- EDIT ----------------
  const openEdit = (item: any, index: number) => {
    setEditingIndex(index);
    setEditForm({
      title: item.title,
      difficulity: item.difficulity,
      endDate: item.endDate,
      completed: item.completed,
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

  // ---------------- ADD TASK ----------------
  const addTask = async () => {
    if (!localSecret) return;

    const newTask = {
      title: 'Nouvelle tâche',
      completed: false,
      difficulity: 1,
      endDate: null,
      createdAt: new Date().toISOString(),
    };

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

    setTasks(prev => sortTasks([newTask, ...prev]));
  };

  // ---------------- DOUBLE TAP ----------------
  const handleTap = (item: any, index: number) => {
    const now = Date.now();
    if (now - lastTap.current < 300) openEdit(item, index);
    lastTap.current = now;
  };

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // ---------------- UI ----------------
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f7fb', padding: 20, paddingTop: 60 }}>

      {/* HEADER */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 28, fontWeight: '800' }}>📋 Tasks</Text>

        {localSecret && (
          <TouchableOpacity
            onPress={addTask}
            style={{
              backgroundColor: '#6366f1',
              width: 45,
              height: 45,
              borderRadius: 999,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontSize: 24 }}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* SECTION */}
      {!localSecret ? (
        <View style={{ marginTop: 20 }}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mot de passe"
            style={{ backgroundColor: 'white', padding: 10, borderRadius: 10 }}
          />

          <TouchableOpacity
            onPress={() => fetchTasks(password)}
            style={{ backgroundColor: '#6366f1', padding: 12, borderRadius: 10, marginTop: 10 }}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>Charger</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setCreatingSection(true)}>
            <Text style={{ textAlign: 'center', marginTop: 10 }}>Créer section</Text>
          </TouchableOpacity>

          {creatingSection && (
            <View style={{ marginTop: 10 }}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="nouvelle section"
                style={{ backgroundColor: 'white', padding: 10, borderRadius: 10 }}
              />

              <TouchableOpacity
                onPress={createSection}
                style={{ backgroundColor: 'green', padding: 10, borderRadius: 10, marginTop: 10 }}
              >
                <Text style={{ color: 'white', textAlign: 'center' }}>Créer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={{ marginVertical: 10 }}>
          <Text>Section: {localSecret}</Text>

          <TouchableOpacity onPress={() => {
            setLocalSecret(null);
            setTasks([]);
          }}>
            <Text style={{ color: 'red' }}>Changer section</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* LIST */}
      <FlatList
        data={safeTasks}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) =>
          editingIndex === index ? (
            <View style={{ backgroundColor: 'white', padding: 12, borderRadius: 12 }}>
              <TextInput
                value={editForm.title}
                onChangeText={t => setEditForm(f => ({ ...f, title: t }))}
              />

              <TouchableOpacity onPress={saveEdit}>
                <Text>💾 Save</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={deleteTask}>
                <Text>🗑 Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={closeEdit}>
                <Text>❌ Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Pressable onPress={() => handleTap(item, index)} onLongPress={() => openEdit(item, index)}>
              <View style={{ backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 10 }}>
                <Text style={{ fontWeight: '700' }}>{item.title}</Text>
                <Text>{item.completed ? '✅' : '🕒'}</Text>
                <Text>⭐ {item.difficulity}/10</Text>
                <Text>📅 {item.endDate || 'Aucune'}</Text>
              </View>
            </Pressable>
          )
        }
      />
    </View>
  );
}