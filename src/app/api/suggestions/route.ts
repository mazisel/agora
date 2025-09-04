import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // 'all' for admins, default for user's own

    if (type === 'all') {
      // Adminler ve kategori yetkililer için - tüm öneri/şikayetleri getir
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('authority_level')
        .eq('id', user.id)
        .single();

      // Admin, manager, team_lead, director yetkisi varsa genel yetki ver
      const hasGeneralAuthority = userProfile && [
        'admin', 
        'manager', 
        'team_lead', 
        'director'
      ].includes(userProfile.authority_level);

      // Öneri/Şikayet kategorisinde support agent mi kontrol et
      let hasSuggestionCategory = false;
      if (!hasGeneralAuthority) {
        const { data: supportAgents, error: agentError } = await supabase
          .from('support_agents')
          .select(`
            category_id,
            support_categories!inner(name)
          `)
          .eq('user_id', user.id);

        if (!agentError && supportAgents) {
          hasSuggestionCategory = supportAgents.some((agent: any) => 
            agent.support_categories.name === 'Öneri / Şikayet'
          );
        }
      }

      if (!hasGeneralAuthority && !hasSuggestionCategory) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      // Tüm öneri/şikayetleri getir (anonim olanlar dahil)
      const { data: suggestions, error } = await supabase
        .from('suggestions')
        .select(`
          *,
          user_profiles!suggestions_user_profiles_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all suggestions:', error);
        return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
      }

      return NextResponse.json(suggestions || []);
    } else {
      // Kullanıcının kendi öneri/şikayetlerini getir
      const { data: suggestions, error } = await supabase
        .from('suggestions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching suggestions:', error);
        return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
      }

      return NextResponse.json(suggestions || []);
    }

  } catch (error: any) {
    console.error('Suggestions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { type, subject, description, department, anonymous } = body;

    // Validasyon
    if (!type || !subject || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['suggestion', 'complaint'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    if (subject.length < 5 || subject.length > 255) {
      return NextResponse.json({ error: 'Subject must be between 5 and 255 characters' }, { status: 400 });
    }

    if (description.length < 10) {
      return NextResponse.json({ error: 'Description must be at least 10 characters' }, { status: 400 });
    }

    // Öneri/Şikayeti oluştur
    const suggestionData: any = {
      type,
      subject,
      description,
      department: department || null,
      anonymous: anonymous || false
    };

    // Anonim değilse user_id ekle
    if (!anonymous) {
      suggestionData.user_id = user.id;
    }

    const { data: suggestion, error } = await supabase
      .from('suggestions')
      .insert(suggestionData)
      .select()
      .single();

    if (error) {
      console.error('Error creating suggestion:', error);
      return NextResponse.json({ error: 'Failed to create suggestion' }, { status: 500 });
    }

    // Öneri/Şikayet kategorisindeki destek kişilerine otomatik atama yap
    try {
      // Öneri/Şikayet kategorisini bul
      const { data: suggestionCategory, error: categoryError } = await supabase
        .from('support_categories')
        .select('id')
        .eq('name', 'Öneri / Şikayet')
        .eq('is_system', true)
        .single();

      if (categoryError || !suggestionCategory) {
        console.error('Öneri/Şikayet kategorisi bulunamadı:', categoryError);
      } else {
        // Bu kategoriye atanmış destek kişilerini bul
        const { data: agents, error: agentsError } = await supabase
          .from('support_agents')
          .select('user_id')
          .eq('category_id', suggestionCategory.id);

        if (agentsError) {
          console.error('Öneri/Şikayet destek kişileri getirilirken hata:', agentsError);
        } else if (agents && agents.length > 0) {
          // Rastgele bir destek kişisi seç
          const randomIndex = Math.floor(Math.random() * agents.length);
          const assignedAgent = agents[randomIndex].user_id;

          // Öneri/Şikayeti güncelle - assigned_to alanı ekle (eğer alan varsa)
          try {
            const { error: updateError } = await supabase
              .from('suggestions')
              .update({ assigned_to: assignedAgent })
              .eq('id', suggestion.id);

            if (updateError) {
              console.error('Öneri/Şikayet atama güncellemesi hatası (alan henüz yok olabilir):', updateError);
            } else {
              console.log('✅ Öneri/Şikayet destek kişisine atandı:', assignedAgent);
            }
          } catch (updateError) {
            console.error('Öneri/Şikayet atama güncellemesi hatası:', updateError);
          }

          // Atanan kişiye bildirim gönder
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              recipient_id: assignedAgent,
              title: `Yeni ${type === 'suggestion' ? 'Öneri' : 'Şikayet'} Atandı`,
              message: `"${subject}" başlıklı yeni bir ${type === 'suggestion' ? 'öneri' : 'şikayet'} size atandı.`,
              type: 'suggestion',
              data: {
                suggestion_id: suggestion.id,
                type,
                subject,
                user_id: anonymous ? null : user.id
              }
            });

          if (notificationError) {
            console.error('Bildirim gönderme hatası:', notificationError);
          } else {
            console.log('✅ Atanan kişiye bildirim gönderildi');
          }
        } else {
          console.log('⚠️ Öneri/Şikayet kategorisinde destek kişisi bulunamadı');
        }
      }
    } catch (assignmentError) {
      console.error('Öneri/Şikayet atama işlemi hatası:', assignmentError);
      // Atama hatası talep oluşturmayı engellemez
    }

    return NextResponse.json({
      success: true,
      message: `${type === 'suggestion' ? 'Suggestion' : 'Complaint'} submitted successfully`,
      data: suggestion
    });

  } catch (error: any) {
    console.error('Suggestion creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { suggestion_id, status, response } = body;

    // Validasyon
    if (!suggestion_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['pending', 'reviewed', 'implemented', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Kullanıcının yetki kontrolü
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('authority_level')
      .eq('id', user.id)
      .single();

    // Admin, manager, team_lead, director yetkisi varsa genel yetki ver
    const hasGeneralAuthority = userProfile && [
      'admin', 
      'manager', 
      'team_lead', 
      'director'
    ].includes(userProfile.authority_level);

    // Öneri/Şikayet kategorisinde support agent mi kontrol et
    let hasSuggestionCategory = false;
    if (!hasGeneralAuthority) {
      const { data: supportAgents, error: agentError } = await supabase
        .from('support_agents')
        .select(`
          category_id,
          support_categories!inner(name)
        `)
        .eq('user_id', user.id);

      if (!agentError && supportAgents) {
        hasSuggestionCategory = supportAgents.some((agent: any) => 
          agent.support_categories.name === 'Öneri / Şikayet'
        );
      }
    }

    if (!hasGeneralAuthority && !hasSuggestionCategory) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Öneri/Şikayeti güncelle
    const updateData: any = {
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    };

    if (response) {
      updateData.response = response;
    }

    const { data: updatedSuggestion, error } = await supabase
      .from('suggestions')
      .update(updateData)
      .eq('id', suggestion_id)
      .select(`
        *,
        user_profiles!suggestions_user_profiles_fkey(first_name, last_name)
      `)
      .single();

    if (error) {
      console.error('Error updating suggestion:', error);
      return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 });
    }

    // Kullanıcıya bildirim gönder (anonim değilse)
    if (updatedSuggestion.user_id) {
      try {
        const statusLabels = {
          pending: 'Beklemede',
          reviewed: 'İncelendi',
          implemented: 'Uygulandı',
          rejected: 'Reddedildi'
        };

        const typeLabels = {
          suggestion: 'Öneri',
          complaint: 'Şikayet'
        };

        const notificationData = {
          recipient_id: updatedSuggestion.user_id,
          title: `${typeLabels[updatedSuggestion.type as keyof typeof typeLabels]} Durumu Güncellendi`,
          message: `"${updatedSuggestion.subject}" başlıklı ${typeLabels[updatedSuggestion.type as keyof typeof typeLabels].toLowerCase()}iniz ${statusLabels[status as keyof typeof statusLabels].toLowerCase()} olarak işaretlendi.${
            response ? ` Yanıt: ${response}` : ''
          }`,
          type: 'suggestion_response',
          data: {
            suggestion_id: updatedSuggestion.id,
            status,
            response: response || null
          }
        };

        await supabase
          .from('notifications')
          .insert(notificationData);

        console.log('✅ Notification sent to user');
      } catch (notificationError) {
        console.error('❌ Failed to send notification:', notificationError);
        // Bildirim hatası güncellemeyi engellemez
      }
    }

    return NextResponse.json({
      success: true,
      message: `Suggestion ${status} successfully`,
      data: updatedSuggestion
    });

  } catch (error: any) {
    console.error('Suggestion update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
