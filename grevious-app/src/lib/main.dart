import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

// ---------------- CONFIGURATION ----------------
const String apiUrl = "https://grievous-api.universalgate.fr"; // URL de votre backend (adapter si nécessaire)

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '📋 Tasks',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5),
        ),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'Tasks'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});
  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  // ---------------- STATE ----------------
  List<dynamic> _tasks = [];
  int? _editingIndex;

  final TextEditingController _titleController = TextEditingController();
  int _editDifficulty = 1;
  String? _editEndDate;
  bool _editCompleted = false;

  bool _isLoading = false;
  String? _error;
  String _password = '';
  String _newPassword = '';
  String? _localSecret;
  bool _creatingSection = false;

  @override
  void initState() {
    super.initState();
    _initAuth();
  }

  void _initAuth() {
    if (_localSecret != null) {
      _password = _localSecret!;
      _fetchTasks(_localSecret!);
    }
  }

  // ---------------- SORT ----------------
  List<dynamic> _sortTasks(List<dynamic> arr) {
    List<dynamic> copy = List.from(arr);
    copy.sort((a, b) {
      bool aCompleted = a['completed'] ?? false;
      bool bCompleted = b['completed'] ?? false;

      if (aCompleted != bCompleted) {
        return aCompleted ? 1 : -1;
      }

      String? aDateStr = a['endDate'];
      String? bDateStr = b['endDate'];

      if (aDateStr != null && bDateStr != null) {
        return DateTime.parse(aDateStr).compareTo(DateTime.parse(bDateStr));
      }
      if (aDateStr != null && bDateStr == null) return -1;
      if (aDateStr == null && bDateStr != null) return 1;

      int aDiff = a['difficulity'] ?? 0;
      int bDiff = b['difficulity'] ?? 0;
      return bDiff.compareTo(aDiff);
    });
    return copy;
  }

  // ---------------- FETCH ----------------
  Future<void> _fetchTasks(String pwd) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final res = await http.get(Uri.parse('$apiUrl/tasks?password=${Uri.encodeComponent(pwd)}'));
      final data = jsonDecode(res.body);

      if (data['error'] != null) {
        setState(() {
          _error = data['error'];
          _tasks = [];
        });
        return;
      }

      setState(() {
        _tasks = _sortTasks(data['tasks'] ?? []);
        _localSecret = pwd;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // ---------------- SECTION ----------------
  Future<void> _createSection() async {
    if (_newPassword.isEmpty) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final res = await http.post(
        Uri.parse('$apiUrl/section'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'password': _newPassword}),
      );
      final data = jsonDecode(res.body);

      if (data['success'] == true) {
        setState(() {
          _localSecret = _newPassword;
          _password = _newPassword;
          _creatingSection = false;
        });
        _fetchTasks(_newPassword);
      } else {
        setState(() => _error = data['error']);
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // ---------------- EDIT ACTIONS ----------------
  void _openEdit(dynamic item, int index) {
    setState(() {
      _editingIndex = index;
      _titleController.text = item['title'] ?? '';
      _editDifficulty = item['difficulity'] ?? 1;
      _editEndDate = item['endDate'];
      _editCompleted = item['completed'] ?? false;
    });
  }

  void _closeEdit() {
    setState(() => _editingIndex = null);
  }

  Future<void> _saveEdit() async {
    if (_editingIndex == null || _localSecret == null) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final updates = {
      'title': _titleController.text,
      'difficulity': _editDifficulty,
      'endDate': _editEndDate,
      'completed': _editCompleted,
    };

    try {
      final res = await http.patch(
        Uri.parse('$apiUrl/task'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'password': _localSecret,
          'index': _editingIndex,
          'updates': updates,
        }),
      );
      final data = jsonDecode(res.body);

      if (data['success'] == true) {
        setState(() {
          _tasks[_editingIndex!] = {
            ..._tasks[_editingIndex!],
            ...updates,
          };
          _tasks = _sortTasks(_tasks);
          _editingIndex = null;
        });
      } else {
        setState(() => _error = data['error']);
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteTask() async {
    if (_editingIndex == null || _localSecret == null) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final res = await http.delete(
        Uri.parse('$apiUrl/task'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'password': _localSecret,
          'index': _editingIndex,
        }),
      );
      final data = jsonDecode(res.body);

      if (data['success'] == true) {
        setState(() {
          _tasks.removeAt(_editingIndex!);
          _editingIndex = null;
        });
      } else {
        setState(() => _error = data['error']);
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _addTask() async {
    if (_localSecret == null) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final newTask = {
      'title': 'Nouvelle tâche',
      'completed': false,
      'difficulity': 1,
      'endDate': null,
      'createdAt': DateTime.now().toIso8601String(),
    };

    try {
      final res = await http.post(
        Uri.parse('$apiUrl/task'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'password': _localSecret,
          'task': newTask,
        }),
      );
      final data = jsonDecode(res.body);

      if (data['success'] == true) {
        _fetchTasks(_localSecret!);
      } else {
        setState(() => _error = data['error']);
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // ---------------- HELPERS ----------------
  Color _getDifficultyColor(int level) {
    const colors = [Color(0xFFFACC15), Color(0xFFF97316), Color(0xFFEA580C), Color(0xFFDC2626), Color(0xFFB91C1C)];
    int index = (level - 1).clamp(0, 4);
    return colors[index];
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final parts = dateStr.split('-');
      if (parts.length >= 3) {
        return '${parts[2]}/${parts[1]}';
      }
      return dateStr;
    } catch (_) {
      return dateStr;
    }
  }

  // ---------------- BUILD UI ----------------
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
        title: const Text(
          '📋 Tasks',
          style: TextStyle(color: Color(0xFF0F172A), fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.5),
        ),
        actions: [
          if (_localSecret != null)
            Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: IconButton(
                onPressed: _addTask,
                icon: const Icon(Icons.add, color: Colors.white, size: 26),
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFF4F46E5),
                  fixedSize: const Size(44, 44),
                ),
              ),
            )
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: Text('⚠️ $_error', style: const TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w600)),
                ),
              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.only(bottom: 12.0),
                  child: LinearProgressIndicator(color: Color(0xFF4F46E5)),
                ),

              // AUTHENTIFICATION CARD
              if (_localSecret == null) ...[
                Card(
                  color: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    side: const BorderSide(color: Color(0xFFE2E8F0)),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextField(
                          obscureText: true,
                          onChanged: (v) => _password = v,
                          decoration: InputDecoration(
                            hintText: "Mot de passe de votre section",
                            hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                            fillColor: const Color(0xFFF1F5F9),
                            filled: true,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                          ),
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: () => _fetchTasks(_password),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF4F46E5),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text("Charger l'espace", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                        ),
                        TextButton(
                          onPressed: () => setState(() => _creatingSection = !_creatingSection),
                          child: Text(_creatingSection ? "Annuler" : "Créer une nouvelle section", style: const TextStyle(color: Color(0xFF64748B), decoration: TextDecoration.underline)),
                        ),
                        if (_creatingSection) ...[
                          const Divider(color: Color(0xFFE2E8F0), height: 32),
                          TextField(
                            onChanged: (v) => _newPassword = v,
                            decoration: InputDecoration(
                              hintText: "Nom de la nouvelle clé",
                              hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                              fillColor: const Color(0xFFF1F5F9),
                              filled: true,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                            ),
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: _createSection,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: const Text("Générer l'espace", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                          ),
                        ]
                      ],
                    ),
                  ),
                )
              ] else ...[
                // BANNER CONNECTÉ
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(color: const Color(0xFFE0F2FE), borderRadius: BorderRadius.circular(10)),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Clé : $_localSecret', style: const TextStyle(color: Color(0xFF0369A1), fontWeight: FontWeight.w600)),
                      GestureDetector(
                        onTap: () => setState(() {
                          _localSecret = null;
                          _tasks = [];
                        }),
                        child: const Text('Déconnexion', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w600)),
                      )
                    ],
                  ),
                ),
              ],

              // LISTE DES TÂCHES
              Expanded(
                child: ListView.builder(
                  itemCount: _tasks.length,
                  itemBuilder: (context, index) {
                    final item = _tasks[index];
                    final bool isEditing = _editingIndex == index;

                    if (isEditing) {
                      // --- ÉTAT MODIFICATION ---
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFF6366F1), width: 1.5),
                        ),
                        child: Column(
                          children: [
                            TextField(
                              controller: _titleController,
                              decoration: InputDecoration(
                                fillColor: const Color(0xFFF1F5F9),
                                filled: true,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                              ),
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Marquer comme terminée', style: TextStyle(color: Color(0xFF475569), fontWeight: FontWeight.w500)),
                                Switch(
                                  value: _editCompleted,
                                  activeColor: const Color(0xFF10B981),
                                  onChanged: (v) => setState(() => _editCompleted = v),
                                )
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Difficulté', style: TextStyle(color: Color(0xFF475569), fontWeight: FontWeight.w500)),
                                Row(
                                  children: [1, 2, 3, 4, 5].map<Widget>((num) {
                                    bool isActive = _editDifficulty == num;
                                    return GestureDetector(
                                      onTap: () => setState(() => _editDifficulty = num),
                                      child: Container(
                                        margin: const EdgeInsets.only(left: 5),
                                        width: 28,
                                        height: 28,
                                        decoration: BoxDecoration(
                                          color: isActive ? _getDifficultyColor(num) : const Color(0xFFF1F5F9),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Center(
                                          child: Text('$num', style: TextStyle(color: isActive ? Colors.white : const Color(0xFF475569), fontWeight: isActive ? FontWeight.bold : FontWeight.normal)),
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                )
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Échéance', style: TextStyle(color: Color(0xFF475569), fontWeight: FontWeight.w500)),
                                Row(
                                  children: [
                                    ElevatedButton(
                                      onPressed: () async {
                                        DateTime? picked = await showDatePicker(
                                          context: context,
                                          initialDate: _editEndDate != null ? DateTime.parse(_editEndDate!) : DateTime.now(),
                                          firstDate: DateTime(2000),
                                          lastDate: DateTime(2100),
                                        );
                                        if (picked != null) {
                                          setState(() => _editEndDate = picked.toIso8601String().split('T')[0]);
                                        }
                                      },
                                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF1F5F9), elevation: 0),
                                      child: Text(_editEndDate != null ? _editEndDate!.split('-').reversed.join('/') : 'Définir une date', style: const TextStyle(color: Color(0xFF334155))),
                                    ),
                                    if (_editEndDate != null)
                                      TextButton(
                                        onPressed: () => setState(() => _editEndDate = null),
                                        child: const Text('Effacer', style: TextStyle(color: Color(0xFFEF4444))),
                                      )
                                  ],
                                )
                              ],
                            ),
                            const Divider(color: Color(0xFFF1F5F9), height: 24),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                TextButton(onPressed: _deleteTask, child: const Text('Supprimer', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w600))),
                                TextButton(onPressed: _closeEdit, child: const Text('Annuler', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600))),
                                TextButton(onPressed: _saveEdit, child: const Text('Enregistrer', style: TextStyle(color: Color(0xFF4F46E5), fontWeight: FontWeight.w600))),
                              ],
                            )
                          ],
                        ),
                      );
                    } else {
                      // --- ÉTAT AFFICHAGE COMPACT ---
                      final bool isCompleted = item['completed'] ?? false;
                      return GestureDetector(
                        onTap: () => _openEdit(item, index),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                          decoration: BoxDecoration(
                            color: isCompleted ? const Color(0xFFF1F5F9) : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isCompleted ? const Color(0xFFCBD5E1) : const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Row(
                                  children: [
                                    Container(
                                      width: 6,
                                      height: 24,
                                      decoration: BoxDecoration(
                                        color: isCompleted ? const Color(0xFFCBD5E1) : _getDifficultyColor(item['difficulity'] ?? 1),
                                        borderRadius: BorderRadius.circular(3),
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Text(
                                        item['title'] ?? '',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w500,
                                          color: isCompleted ? const Color(0xFF94A3B8) : const Color(0xFF1E293B),
                                          decoration: isCompleted ? TextDecoration.lineThrough : null,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Row(
                                children: [
                                  if (item['endDate'] != null) ...[
                                    Text(
                                      '📅 ${_formatDate(item['endDate'])}',
                                      style: TextStyle(fontSize: 12, color: const Color(0xFF64748B), decoration: isCompleted ? TextDecoration.lineThrough : null),
                                    ),
                                  ],
                                  if (isCompleted)
                                    Container(
                                      margin: const EdgeInsets.only(left: 10),
                                      padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 8),
                                      decoration: BoxDecoration(color: const Color(0xFFD1FAE5), borderRadius: BorderRadius.circular(6)),
                                      child: const Text('Fait', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF065F46))),
                                    )
                                ],
                              )
                            ],
                          ),
                        ),
                      );
                    }
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}