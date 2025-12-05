import { useState, useEffect, useMemo } from 'react';
import { InventoryItem, ItemCategory, ItemCondition } from '@/types/inventory';

const STORAGE_KEY = 'eventtech-inventory';

const initialItems: InventoryItem[] = [
  {
    id: '1',
    name: 'XLR Kabel 10m',
    category: 'Kabel',
    quantity: 20,
    condition: 'verfügbar',
    location: 'Lager A',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'JBL EON615 Lautsprecher',
    category: 'Lautsprecher',
    quantity: 4,
    condition: 'verliehen',
    location: 'Event München',
    notes: 'Verliehen bis 15.12.2024',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Moving Head Wash',
    category: 'Lichttechnik',
    quantity: 8,
    condition: 'in-einsatz',
    location: 'Bühne B',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    name: 'Shure SM58 Mikrofon',
    category: 'Mikrofone',
    quantity: 12,
    condition: 'verfügbar',
    location: 'Lager A',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '5',
    name: 'DI-Box aktiv',
    category: 'Zubehör',
    quantity: 6,
    condition: 'defekt',
    location: 'Werkstatt',
    notes: 'Netzteil defekt, Ersatz bestellt',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '6',
    name: 'PAR LED RGBW',
    category: 'Lichttechnik',
    quantity: 16,
    condition: 'verfügbar',
    location: 'Lager B',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '7',
    name: 'Sennheiser EW100 Funk',
    category: 'Mikrofone',
    quantity: 4,
    condition: 'in-einsatz',
    location: 'Kongress Berlin',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '8',
    name: 'Stromverteiler 32A',
    category: 'Zubehör',
    quantity: 3,
    condition: 'verfügbar',
    location: 'Lager A',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all');
  const [conditionFilter, setConditionFilter] = useState<ItemCondition | 'all'>('all');

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setItems(parsed.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        })));
      } catch {
        setItems(initialItems);
      }
    } else {
      setItems(initialItems);
    }
  }, []);

  // Save to localStorage when items change
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
      
      return matchesSearch && matchesCategory && matchesCondition;
    });
  }, [items, searchQuery, categoryFilter, conditionFilter]);

  const stats = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.quantity, 0);
    const available = items.filter(i => i.condition === 'verfügbar').reduce((sum, item) => sum + item.quantity, 0);
    const lent = items.filter(i => i.condition === 'verliehen').reduce((sum, item) => sum + item.quantity, 0);
    const inUse = items.filter(i => i.condition === 'in-einsatz').reduce((sum, item) => sum + item.quantity, 0);
    const defect = items.filter(i => i.condition === 'defekt').reduce((sum, item) => sum + item.quantity, 0);
    
    return { total, available, lent, inUse, defect };
  }, [items]);

  const addItem = (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setItems([newItem, ...items]);
  };

  const updateItem = (id: string, updates: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, ...updates, updatedAt: new Date() }
        : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setConditionFilter('all');
  };

  return {
    items: filteredItems,
    allItems: items,
    stats,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    conditionFilter,
    setConditionFilter,
    clearFilters,
    addItem,
    updateItem,
    deleteItem,
  };
}
