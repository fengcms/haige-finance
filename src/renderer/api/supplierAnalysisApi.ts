import { unwrapResult } from '@/renderer/api/client';
import type { SupplierAnalysisBundle, SupplierAnalysisQuery } from '@/shared/types/supplierAnalysis';

export const supplierAnalysisApi = {
  get: (query?: SupplierAnalysisQuery) => unwrapResult(getHaigeApi().supplierAnalysis.get(query)) as Promise<SupplierAnalysisBundle>,
};

function getHaigeApi() {
  if (!window.haige?.supplierAnalysis) {
    throw new Error('供应商费用分析接口未就绪，请重启开发服务');
  }

  return window.haige;
}
