import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().slice(0, 10);

    const { data: menu, error: menuError } = await supabase
      .from('mess_menu')
      .select('id, meal_type')
      .eq('date', today);

    if (menuError) {
      console.error('Error fetching menu:', menuError);
      return new Response(JSON.stringify({ success: false, error: menuError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    if (!menu || menu.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No menu found for today, skipping' }), { headers: { 'Content-Type': 'application/json' } });
    }

    const menuIds = menu.map(m => m.id);
    const mealNames = ['morning_tea', 'breakfast', 'lunch', 'snacks', 'dinner'];
    const ratings = [];

    for (const meal of mealNames) {
      const mealMenuIds = menu.filter(m => m.meal_type === meal).map(m => m.id);
      if (mealMenuIds.length === 0) continue;

      const { data: mealRatings, error: ratingError } = await supabase
        .from('mess_ratings')
        .select('rating')
        .in('menu_id', mealMenuIds)
        .eq('date', today);

      if (ratingError) {
        console.error(`Error fetching ${meal} ratings:`, ratingError);
        continue;
      }

      if (mealRatings && mealRatings.length > 0) {
        const avg = mealRatings.reduce((sum, r) => sum + r.rating, 0) / mealRatings.length;
        ratings.push({ meal, average: Math.round(avg * 10) / 10, count: mealRatings.length });
      }
    }

    if (ratings.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No ratings found for today, skipping' }), { headers: { 'Content-Type': 'application/json' } });
    }

    const title = `Mess Ratings \u2014 ${today}`;

    const { data: existing } = await supabase
      .from('announcements')
      .select('id')
      .eq('title', title)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, message: 'Announcement already exists, skipping' }), { headers: { 'Content-Type': 'application/json' } });
    }

    const lines = ratings.map(r => `${r.meal}: ${r.average}/5 (${r.count} ratings)`);
    const body = `Today's mess ratings:\n${lines.join('\n')}`;

    const { error: insertError } = await supabase
      .from('announcements')
      .insert({
        title,
        body,
        created_by: null,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error inserting announcement:', insertError);
      return new Response(JSON.stringify({ success: false, error: insertError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(
      JSON.stringify({ success: true, date: today, ratings }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
