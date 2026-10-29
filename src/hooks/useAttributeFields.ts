import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

export type FieldType = 'text' | 'number' | 'select' | 'boolean' | 'date';

export interface AttributeFieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  unit?: string;
}

// ─── Default attribute definitions per category ──────────────────────────────
const DEFAULT_ATTRIBUTE_FIELDS: Record<string, AttributeFieldDef[]> = {
  'licht': [
    { key: 'lamp_type', label: 'attr.licht.lamp_type', type: 'select', options: ['LED', 'Halogen', 'Entladung', 'Laser'] },
    { key: 'cooling', label: 'attr.licht.cooling', type: 'select', options: ['Aktiv', 'Passiv'] },
    { key: 'beam_angle_min', label: 'attr.licht.beam_angle_min', type: 'number', unit: '°', placeholder: '5' },
    { key: 'beam_angle_max', label: 'attr.licht.beam_angle_max', type: 'number', unit: '°', placeholder: '60' },
    { key: 'dmx_mode', label: 'attr.licht.dmx_mode', type: 'text', placeholder: 'Standard / Extended' },
    { key: 'unit_price', label: 'attr.common.unit_price', type: 'number', unit: '€', placeholder: '500' },
    { key: 'weight_kg', label: 'attr.common.weight_kg', type: 'number', unit: 'kg', placeholder: '2.5' },
  ],
  'audio': [
    { key: 'frequency_range', label: 'attr.audio.frequency_range', type: 'text', placeholder: '20Hz – 20kHz' },
    { key: 'impedance', label: 'attr.audio.impedance', type: 'number', unit: 'Ω', placeholder: '8' },
    { key: 'connector_type', label: 'attr.audio.connector_type', type: 'text', placeholder: 'XLR, USB …' },
    { key: 'unit_price', label: 'attr.common.unit_price', type: 'number', unit: '€', placeholder: '150' },
    { key: 'weight_kg', label: 'attr.common.weight_kg', type: 'number', unit: 'kg', placeholder: '5' },
    { key: 'dimensions_cm', label: 'attr.common.dimensions_cm', type: 'text', placeholder: '30 × 30 × 25' },
  ],
  'video': [
    { key: 'resolution', label: 'attr.video.resolution', type: 'text', placeholder: '4K, Full HD …' },
    { key: 'connectivity', label: 'attr.common.connectivity', type: 'text', placeholder: 'HDMI, SDI, Fiber …' },
    { key: 'unit_price', label: 'attr.common.unit_price', type: 'number', unit: '€', placeholder: '1000' },
    { key: 'weight_kg', label: 'attr.common.weight_kg', type: 'number', unit: 'kg', placeholder: '3' },
  ],
  'rigging': [
    { key: 'load_capacity', label: 'attr.rigging.load_capacity', type: 'number', unit: 'kg', placeholder: '500' },
    { key: 'material', label: 'attr.rigging.material', type: 'text', placeholder: 'Stahl, Aluminium …' },
    { key: 'unit_price', label: 'attr.common.unit_price', type: 'number', unit: '€', placeholder: '200' },
    { key: 'weight_kg', label: 'attr.common.weight_kg', type: 'number', unit: 'kg', placeholder: '5' },
  ],
  'strom': [
    { key: 'amperage', label: 'attr.strom.amperage', type: 'number', unit: 'A', placeholder: '32' },
    { key: 'voltage', label: 'attr.strom.voltage', type: 'number', unit: 'V', placeholder: '230' },
    { key: 'connector_type', label: 'attr.audio.connector_type', type: 'text', placeholder: 'CEE, Schuko …' },
    { key: 'unit_price', label: 'attr.common.unit_price', type: 'number', unit: '€', placeholder: '50' },
  ],
  'it-netzwerk': [
    { key: 'bandwidth', label: 'attr.network.bandwidth', type: 'text', placeholder: 'Gigabit, 10GbE …' },
    { key: 'connector_type', label: 'attr.audio.connector_type', type: 'text', placeholder: 'RJ45, Fiber …' },
    { key: 'unit_price', label: 'attr.common.unit_price', type: 'number', unit: '€', placeholder: '100' },
  ],
  'werkzeug': [
    { key: 'unit_price', label: 'attr.common.unit_price', type: 'number', unit: '€', placeholder: '50' },
    { key: 'weight_kg', label: 'attr.common.weight_kg', type: 'number', unit: 'kg', placeholder: '2' },
    { key: 'dimensions_cm', label: 'attr.common.dimensions_cm', type: 'text', placeholder: '50 × 30 × 15' },
  ],
};

/**
 * Semantics: every default field is enabled unless the user explicitly disabled it
 * (a category_attributes row with enabled = false).
 */
export function useAttributeFields() {
  const { user } = useAuth();
  const userId = user?.id;
  // category_id → explicitly disabled attribute keys
  const [disabledMap, setDisabledMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // ─── Fetch attribute settings for each category ─────────────────────────────
  useEffect(() => {
    if (!userId) {
      setDisabledMap({});
      setLoading(false);
      return;
    }
    let active = true;

    const fetchAttributeSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('category_attributes')
          .select('category_id, attribute_key, enabled')
          .eq('user_id', userId)
          .eq('enabled', false);

        if (error) throw error;

        const map: Record<string, string[]> = {};
        (data ?? []).forEach(row => {
          if (!map[row.category_id]) map[row.category_id] = [];
          map[row.category_id].push(row.attribute_key);
        });
        if (active) setDisabledMap(map);
      } catch (error) {
        logger.error('useAttributeFields', 'Error fetching attribute settings', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAttributeSettings();
    return () => { active = false; };
  }, [userId]);

  // ─── Get all available fields for a category (enabled + disabled) ────────────
  const getAllFieldsForCategory = useCallback((categoryId: string): AttributeFieldDef[] => {
    return DEFAULT_ATTRIBUTE_FIELDS[categoryId] || [];
  }, []);

  // ─── Get fields for a specific category (only enabled ones) ──────────────────
  const getFieldsForCategory = useCallback((categoryId: string): AttributeFieldDef[] => {
    const defaults = DEFAULT_ATTRIBUTE_FIELDS[categoryId] || [];
    const disabled = disabledMap[categoryId];
    if (!disabled || disabled.length === 0) return defaults;
    return defaults.filter(field => !disabled.includes(field.key));
  }, [disabledMap]);

  // ─── Get enabled status for all attributes in a category ────────────────────
  const getEnabledAttributesForCategory = useCallback(async (categoryId: string): Promise<Set<string>> => {
    const allKeys = (DEFAULT_ATTRIBUTE_FIELDS[categoryId] || []).map(f => f.key);
    if (!userId) return new Set(allKeys);

    const { data, error } = await supabase
      .from('category_attributes')
      .select('attribute_key, enabled')
      .eq('user_id', userId)
      .eq('category_id', categoryId);

    if (error) {
      logger.error('useAttributeFields', 'Error fetching enabled attributes', error);
      return new Set();
    }

    const disabled = new Set((data ?? []).filter(row => !row.enabled).map(row => row.attribute_key));
    return new Set(allKeys.filter(key => !disabled.has(key)));
  }, [userId]);

  // ─── Toggle attribute for a category ─────────────────────────────────────────
  const toggleCategoryAttribute = useCallback(async (categoryId: string, attributeKey: string, enabled: boolean) => {
    if (!userId) return;

    // Always use upsert to handle both create and update
    const { error } = await supabase
      .from('category_attributes')
      .upsert({
        user_id: userId,
        category_id: categoryId,
        attribute_key: attributeKey,
        enabled,
      }, {
        onConflict: 'user_id,category_id,attribute_key'
      });

    if (error) {
      logger.error('useAttributeFields', 'Error toggling attribute', error);
      throw error;
    }

    // Update local state immutably
    setDisabledMap(prev => {
      const current = prev[categoryId] ?? [];
      const next = enabled
        ? current.filter(k => k !== attributeKey)
        : current.includes(attributeKey) ? current : [...current, attributeKey];
      return { ...prev, [categoryId]: next };
    });
  }, [userId]);

  return {
    getFieldsForCategory,
    getAllFieldsForCategory,
    getEnabledAttributesForCategory,
    toggleCategoryAttribute,
    loading,
  };
}
