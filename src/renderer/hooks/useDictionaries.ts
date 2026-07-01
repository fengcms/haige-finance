import { useEffect, useMemo, useState } from 'react';
import { dictionaryApi } from '@/renderer/api/dictionaryApi';
import type { DictionaryType } from '@/shared/constants/dictionaries';
import type { DictionaryItem } from '@/shared/types/dictionary';

export function useDictionaries(types: DictionaryType[]) {
  const [items, setItems] = useState<DictionaryItem[]>([]);

  useEffect(() => {
    let mounted = true;

    void Promise.all(types.map((dictType) => dictionaryApi.list({ dictType }))).then((results) => {
      if (mounted) {
        setItems(results.flat());
      }
    });

    return () => {
      mounted = false;
    };
  }, [types.join('|')]);

  return useMemo(() => {
    const byType = new Map<DictionaryType, DictionaryItem[]>();

    for (const item of items) {
      const list = byType.get(item.dictType) ?? [];
      list.push(item);
      byType.set(item.dictType, list);
    }

    return {
      items,
      labels(dictType: DictionaryType, fallback: Record<string, string> = {}) {
        const result = { ...fallback };
        for (const item of byType.get(dictType) ?? []) {
          result[item.code] = item.name;
        }
        return result;
      },
      options(dictType: DictionaryType, fallback: Record<string, string> = {}) {
        const list = byType.get(dictType);
        if (!list || list.length === 0) {
          return toOptions(fallback);
        }

        return list
          .filter((item) => item.status === 'active')
          .map((item) => ({
            value: item.code,
            label: item.name,
          }));
      },
    };
  }, [items]);
}

function toOptions(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({
    value,
    label,
  }));
}
