import { useEffect, useState } from 'react';
import { defaultPageSize, type PageSizeOption } from '@/shared/constants/pagination';
import { settingsApi } from '@/renderer/api/settingsApi';

export function useDefaultPageSize() {
  const [pageSize, setPageSize] = useState<PageSizeOption>(defaultPageSize);

  useEffect(() => {
    let mounted = true;

    void settingsApi
      .get()
      .then((settings) => {
        if (mounted) {
          setPageSize(settings.defaultPageSize);
        }
      })
      .catch(() => {
        if (mounted) {
          setPageSize(defaultPageSize);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return pageSize;
}
