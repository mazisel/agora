
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/models/note_model.dart';
import '../../data/repositories/notes_repository.dart';

// Repository Provider
final notesRepositoryProvider = Provider<NotesRepository>((ref) {
  return NotesRepository(Supabase.instance.client);
});

// Notes List Provider
final notesProvider = AsyncNotifierProvider<NotesNotifier, List<NoteModel>>(() {
  return NotesNotifier();
});

class NotesNotifier extends AsyncNotifier<List<NoteModel>> {
  @override
  Future<List<NoteModel>> build() async {
    return _fetchNotes();
  }

  Future<List<NoteModel>> _fetchNotes() async {
    try {
      final repository = ref.read(notesRepositoryProvider);
      final user = Supabase.instance.client.auth.currentUser;
      
      if (user == null) {
         debugPrint('NotesNotifier: No user logged in');
         return [];
      }
      
      return repository.getNotes(user.id);
    } catch (e, st) {
      debugPrint('NotesNotifier Error: $e');
      debugPrintStack(stackTrace: st);
      throw e;
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _fetchNotes());
  }

  Future<void> addNote(NoteModel note) async {
    final repository = ref.read(notesRepositoryProvider);
    await repository.createNote(note);
    ref.invalidateSelf();
  }

  Future<void> updateNote(NoteModel note) async {
    final repository = ref.read(notesRepositoryProvider);
    await repository.updateNote(note);
    ref.invalidateSelf();
  }

  Future<void> deleteNote(String noteId) async {
     final repository = ref.read(notesRepositoryProvider);
     await repository.deleteNote(noteId);
     ref.invalidateSelf();
  }
}
