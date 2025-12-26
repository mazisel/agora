
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/note_model.dart';

class NotesRepository {
  final SupabaseClient _client;

  NotesRepository(this._client);

  Future<List<NoteModel>> getNotes(String userId) async {
    final response = await _client
        .from('notes')
        .select()
        .eq('user_id', userId)
        .order('pinned', ascending: false)
        .order('created_at', ascending: false);

    return (response as List).map((e) => NoteModel.fromJson(e)).toList();
  }

  Future<NoteModel> createNote(NoteModel note) async {
    final response = await _client.from('notes').insert({
      'title': note.title,
      'content': note.content,
      'color': note.color,
      'pinned': note.pinned,
      'user_id': note.userId,
    }).select().single();

    return NoteModel.fromJson(response);
  }

  Future<NoteModel> updateNote(NoteModel note) async {
    final response = await _client
        .from('notes')
        .update({
          'title': note.title,
          'content': note.content,
          'color': note.color,
          'pinned': note.pinned,
          'updated_at': DateTime.now().toIso8601String(),
        })
        .eq('id', note.id)
        .select()
        .single();

    return NoteModel.fromJson(response);
  }

  Future<void> deleteNote(String noteId) async {
    await _client.from('notes').delete().eq('id', noteId);
  }
}
