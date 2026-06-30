import { z } from 'zod';
import { ProjectStatsService } from '../services/projectStatsService.js';
import { registerIpcHandler } from './helpers.js';

const detailPayloadSchema = z.object({
  projectId: z.string().min(1),
});

export function registerProjectStatsIpc() {
  const service = new ProjectStatsService();

  registerIpcHandler('project-stats:list', () => service.list());
  registerIpcHandler('project-stats:detail', (payload) => {
    const { projectId } = detailPayloadSchema.parse(payload);
    return service.detail(projectId);
  });
}
