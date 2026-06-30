import dayjs from 'dayjs';
import type { PingResult } from '../../shared/types/app.js';
import { AppRepository } from '../repositories/appRepository.js';

export class AppService {
  constructor(private readonly appRepository = new AppRepository()) {}

  ping(): PingResult {
    return {
      message: 'pong',
      appName: '海哥财务管理',
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      database: this.appRepository.getDatabaseStatus(),
    };
  }
}
