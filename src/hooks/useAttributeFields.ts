import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

export function useAttributeFields() {
  const { user } = useAuth();
  const [categoryAttributeMap, setCategoryAttributeMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // ─── Fetch enabled attributes for each category ─────────────────────────────
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAttributeSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('category_attributes')
          .select('category_id, attribute_key, enabled')
          .eq('user_id', user.id)
          .eq('enabled', true);

        if (error) throw error;

        // Build map: category_id → enabled attribute keys
        const map: Record<string, string[]> = {};
        if (data) {
          data.forEach(row => {
            if (!map[row.category_id]) map[row.category_id] = [];
            map[row.category_id].push(row.attribute_key);
          });
        }
        setCategoryAttributeMap(map);
      } catch (error) {
        console.error('Error fetching attribute settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttributeSettings();
  }, [user]);

  // ─── Get fields for a specific category ──────────────────────────────────────
  const getFieldsForCategory = (categoryId: string): AttributeFieldDef[] => {
    const defaults = DEFAULT_ATTRIBUTE_FIELDS[categoryId] || [];
    
    // If no custom settings exist, return all defaults
    const enabledKeys = categoryAttributeMap[categoryId];
    if (!enabledKeys || enabledKeys.length === 0) {
      return defaults;
    }

    // Filter defaults to only show enabled fields
    return defaults.filter(field => enabledKeys.includes(field.key));
  };

  // ─── Get all available fields for a category (enabled + disabled) ────────────
  const getAllFieldsForCategory = (categoryId: string): AttributeFieldDef[] => {
    return DEFAULT_ATTRIBUTE_FIELDS[categoryId] || [];
  };

  // ─── Get enabled status for all attributes in a category ────────────────────
  const getEnabledAttributesForCategory = async (categoryId: string): Promise<Set<string>> => {
    if (!user) return new Set();

    try {
      const { data, error } = await supabase
        .from('category_attributes')
        .select('attribute_key, enabled')
        .eq('user_id', user.id)
        .eq('category_id', categoryId);

      if (error) throw error;

      // If no data exists, all are enabled by default
      if (!data || data.length === 0) {
        const allFields = getAllFieldsForCategory(categoryId);
        return new Set(allFields.map(f => f.key));
      }

      // Build set of enabled attributes
      const enabledSet = new Set<string>();
      data.forEach(row => {
        if (row.enabled) {
          enabledSet.add(row.attribute_key);
        }
      });

      return enabledSet;
    } catch (error) {
      console.error('Error fetching enabled attributes:', error);
      return new Set();
    }
  };

  // ─── Toggle attribute for a category ─────────────────────────────────────────
  const toggleCategoryAttribute = async (categoryId: string, attributeKey: string, enabled: boolean) => {
    if (!user) return;

    try {
      // Always use upsert to handle both create and update
      const { error } = await supabase
        .from('category_attributes')
        .upsert({
          user_id: user.id,
          category_id: categoryId,
          attribute_key: attributeKey,
          enabled: enabled,
        }, {
          onConflict: 'user_id,category_id,attribute_key'
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Update local state
      const newMap = { ...categoryAttributeMap };
      if (!newMap[categoryId]) newMap[categoryId] = [];
      
      if (enabled) {
        if (!newMap[categoryId].includes(attributeKey)) {
          newMap[categoryId].push(attributeKey);
        }
      } else {
        newMap[categoryId] = newMap[categoryId].filter(k => k !== attributeKey);
      }
      setCategoryAttributeMap(newMap);
    } catch (error) {
      console.error('Error toggling attribute:', error);
      throw error;
    }
  };

  return {
    getFieldsForCategory,
    getAllFieldsForCategory,
    getEnabledAttributesForCategory,
    toggleCategoryAttribute,
    loading,
  };
}
