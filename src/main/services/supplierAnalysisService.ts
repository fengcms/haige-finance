import dayjs from 'dayjs';
import { supplierAnalysisQuerySchema } from '../../shared/schemas/supplierAnalysis.js';
import type { SupplierAnalysisBundle, SupplierAnalysisQuery } from '../../shared/types/supplierAnalysis.js';
import { SupplierAnalysisRepository } from '../repositories/supplierAnalysisRepository.js';

export class SupplierAnalysisService {
  constructor(private readonly repository = new SupplierAnalysisRepository()) {}

  getAnalysis(input: unknown): SupplierAnalysisBundle {
    const parsed = supplierAnalysisQuerySchema.parse(input) as SupplierAnalysisQuery | undefined;
    const today = dayjs();
    const query = {
      startDate: parsed?.startDate ?? today.startOf('month').format('YYYY-MM-DD'),
      endDate: parsed?.endDate ?? today.endOf('month').format('YYYY-MM-DD'),
      supplierId: parsed?.supplierId,
      projectId: parsed?.projectId,
      expenseType: parsed?.expenseType,
    };

    if (dayjs(query.endDate).isBefore(dayjs(query.startDate))) {
      throw new Error('结束日期不能早于开始日期');
    }

    const trendGranularity = dayjs(query.endDate).diff(dayjs(query.startDate), 'day') > 60 ? 'month' : 'day';
    const summaryRow = this.repository.getSummary(query);
    const totalAmountCents = Number(summaryRow.total_amount_cents ?? 0);
    const orderCount = Number(summaryRow.order_count ?? 0);

    return {
      query,
      trendGranularity,
      summary: {
        totalAmountCents,
        supplierCount: Number(summaryRow.supplier_count ?? 0),
        orderCount,
        averageOrderAmountCents: orderCount > 0 ? Math.round(totalAmountCents / orderCount) : 0,
        latestOccurredDate: summaryRow.latest_occurred_date ? String(summaryRow.latest_occurred_date) : null,
      },
      supplierRank: this.repository.getSupplierRank(query),
      trend: this.repository.getTrend(query, trendGranularity),
      projectDistribution: this.repository.getProjectDistribution(query),
      details: this.repository.getDetails(query),
    };
  }
}
