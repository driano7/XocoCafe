import { supabase } from '@/lib/supabase';

const COUNTERS_TABLE = 'app_counters';

export async function incrementAppCounter(key: string, amount = 1): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from(COUNTERS_TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error(`Error obteniendo contador ${key}:`, error);
      return null;
    }

    const currentValue = typeof data?.value === 'number' ? data.value : 0;
    const newValue = currentValue + amount;

    const { error: upsertError } = await supabase.from(COUNTERS_TABLE).upsert(
      {
        key,
        value: newValue,
        updatedAt: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    if (upsertError) {
      console.error(`Error actualizando contador ${key}:`, upsertError);
      return null;
    }

    return newValue;
  } catch (error) {
    console.error(`Error general incrementando contador ${key}:`, error);
    return null;
  }
}
