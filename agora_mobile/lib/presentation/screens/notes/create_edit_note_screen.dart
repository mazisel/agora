
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../data/models/note_model.dart';
import '../../providers/notes_provider.dart';

class CreateEditNoteScreen extends ConsumerStatefulWidget {
  final NoteModel? note;

  const CreateEditNoteScreen({super.key, this.note});

  @override
  ConsumerState<CreateEditNoteScreen> createState() => _CreateEditNoteScreenState();
}

class _CreateEditNoteScreenState extends ConsumerState<CreateEditNoteScreen> {
  final _formKey = GlobalKey<FormState>();
  
  late TextEditingController _titleController;
  late TextEditingController _contentController;
  
  // Maps web gradient strings to Flutter Colors for selection
  final Map<String, Color> _colorMap = {
    'from-blue-400 to-blue-600': Colors.blue,
    'from-green-400 to-green-600': Colors.green,
    'from-purple-400 to-purple-600': Colors.purple,
    'from-orange-400 to-orange-600': Colors.orange,
    'from-pink-400 to-pink-600': Colors.pink,
  };
  
  late String _selectedColor;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.note?.title);
    _contentController = TextEditingController(text: widget.note?.content);
    _selectedColor = widget.note?.color ?? _colorMap.keys.first;
    
    // If creating a new note, editing is enabled. If viewing existing, it's disabled.
    _isEditingEnabled = widget.note == null;
  }
  
  bool _isEditingEnabled = false;

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _saveNote() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);

    try {
      final notifier = ref.read(notesProvider.notifier);
      final user = Supabase.instance.client.auth.currentUser;
      
      if (user == null) throw Exception('Kullanıcı oturumu bulunamadı');

      if (widget.note == null) {
        // Create
        final newNote = NoteModel(
          id: '', // Server generated
          title: _titleController.text,
          content: _contentController.text,
          color: _selectedColor,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          userId: user.id,
          pinned: false,
        );
        await notifier.addNote(newNote);
      } else {
        // Update
        final updatedNote = widget.note!.copyWith(
          title: _titleController.text,
          content: _contentController.text,
          color: _selectedColor,
          updatedAt: DateTime.now(),
        );
        await notifier.updateNote(updatedNote);
      }

      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(
           SnackBar(content: Text(widget.note == null ? 'Not oluşturuldu' : 'Not güncellendi')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Hata: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Current primary color for UI theming
    final primaryColor = _colorMap[_selectedColor] ?? Colors.blue;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.note != null ? 'Notu Düzenle' : 'Yeni Not'),
        actions: [
          if (_isLoading)
            const Center(child: Padding(
              padding: EdgeInsets.all(16.0),
              child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
            ))
          else if (!_isEditingEnabled)
            IconButton(
              icon: const Icon(LucideIcons.pencil),
              onPressed: () => setState(() => _isEditingEnabled = true),
            )
          else
            IconButton(
              icon: const Icon(LucideIcons.check),
              onPressed: _saveNote,
            )
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Title Input
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                hintText: 'Başlık',
                border: InputBorder.none,
                hintStyle: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              validator: (value) =>
                  value == null || value.isEmpty ? 'Başlık boş olamaz' : null,
              enabled: _isEditingEnabled,
            ),
            
            const Divider(),

            // Color Selection
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _colorMap.entries.map((entry) {
                  final isSelected = _selectedColor == entry.key;
                  return GestureDetector(
                    onTap: _isEditingEnabled ? () => setState(() => _selectedColor = entry.key) : null,
                    child: Container(
                      margin: const EdgeInsets.only(right: 12),
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: entry.value.withOpacity(_isEditingEnabled ? 1.0 : 0.5),
                        shape: BoxShape.circle,
                        border: isSelected ? Border.all(color: Colors.white, width: 2) : null,
                        boxShadow: isSelected ? [
                          BoxShadow(color: entry.value.withOpacity(0.4), blurRadius: 8, spreadRadius: 2)
                        ] : null,
                      ),
                      child: isSelected ? const Icon(LucideIcons.check, color: Colors.white, size: 16) : null,
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 16),

            // Content Input
            TextFormField(
              controller: _contentController,
              decoration: const InputDecoration(
                hintText: 'Notunuzu buraya yazın...',
                border: InputBorder.none,
              ),
              maxLines: null,
              keyboardType: TextInputType.multiline,
              validator: (value) =>
                  value == null || value.isEmpty ? 'İçerik boş olamaz' : null,
              enabled: _isEditingEnabled,
            ),
          ],
        ),
      ),
    );
  }
}
