
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../providers/notes_provider.dart';
import '../../../data/models/note_model.dart';
import 'create_edit_note_screen.dart'; // For navigation reference

class NotesScreen extends ConsumerStatefulWidget {
  const NotesScreen({super.key});

  @override
  ConsumerState<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends ConsumerState<NotesScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  
  // Maps web gradient strings to Flutter Colors
  final Map<String, Color> _colorMap = {
    'from-blue-400 to-blue-600': Colors.blue.shade700,
    'from-green-400 to-green-600': Colors.green.shade700,
    'from-purple-400 to-purple-600': Colors.purple.shade700,
    'from-orange-400 to-orange-600': Colors.orange.shade700,
    'from-pink-400 to-pink-600': Colors.pink.shade700,
  };
  
  Color _getColor(String colorString) {
    return _colorMap[colorString] ?? Colors.blueGrey;
  }

  @override
  Widget build(BuildContext context) {
    final notesAsync = ref.watch(notesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notlarım'),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Ara...',
                prefixIcon: const Icon(LucideIcons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Theme.of(context).cardColor,
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
              onChanged: (value) => setState(() => _searchQuery = value),
            ),
          ),
          
          Expanded(
            child: notesAsync.when(
              data: (notes) {
                final filteredNotes = notes.where((note) {
                  final query = _searchQuery.toLowerCase();
                  return note.title.toLowerCase().contains(query) ||
                         note.content.toLowerCase().contains(query);
                }).toList();

                if (filteredNotes.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                         const Icon(LucideIcons.stickyNote, size: 64, color: Colors.grey),
                         const SizedBox(height: 16),
                         Text(
                           _searchQuery.isEmpty ? 'Henüz notunuz yok' : 'Sonuç bulunamadı',
                           style: const TextStyle(color: Colors.grey),
                         ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () => ref.read(notesProvider.notifier).refresh(),
                  child: GridView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      childAspectRatio: 0.85, 
                    ),
                    itemCount: filteredNotes.length,
                    itemBuilder: (context, index) {
                      final note = filteredNotes[index];
                      return _buildNoteCard(note);
                    },
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) => Center(child: Text('Hata: $err')),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const CreateEditNoteScreen()),
          );
        },
        child: const Icon(LucideIcons.plus),
      ),
    );
  }

  Widget _buildNoteCard(NoteModel note) {
    // Determine color
    final color = _getColor(note.color);
    
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => CreateEditNoteScreen(note: note)),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: color.withOpacity(0.2), // Light background
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.5)),
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    note.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (note.pinned)
                  const Icon(LucideIcons.pin, size: 14, color: Colors.amber),
              ],
            ),
            const SizedBox(height: 8),
            Expanded(
              child: Text(
                note.content,
                style: TextStyle(
                  color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.8),
                  fontSize: 12,
                ),
                maxLines: 6,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  DateFormat('d MMM').format(note.createdAt),
                  style: TextStyle(
                    fontSize: 10,
                    color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.6),
                  ),
                ),
                GestureDetector(
                  onTap: () => _showOptions(note),
                  child: const Icon(LucideIcons.moreVertical, size: 16),
                )
              ],
            )
          ],
        ),
      ),
    );
  }

  void _showOptions(NoteModel note) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: Icon(note.pinned ? LucideIcons.pinOff : LucideIcons.pin),
              title: Text(note.pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'),
              onTap: () {
                Navigator.pop(context);
                ref.read(notesProvider.notifier).updateNote(note.copyWith(pinned: !note.pinned));
              },
            ),
            ListTile(
              leading: const Icon(LucideIcons.trash2, color: Colors.red),
              title: const Text('Sil', style: TextStyle(color: Colors.red)),
              onTap: () {
                Navigator.pop(context);
                _confirmDelete(note);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(NoteModel note) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Notu Sil'),
        content: const Text('Bu notu silmek istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () {
              ref.read(notesProvider.notifier).deleteNote(note.id);
              Navigator.pop(context);
            },
            child: const Text('Sil', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
