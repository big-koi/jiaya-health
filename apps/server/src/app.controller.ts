import { Controller, Get } from '@nestjs/common'
import type { ServiceStatus } from '@bp/contracts'

@Controller()
export class AppController {
  @Get('health')
  health(): ServiceStatus {
    return { status: 'ok', service: 'jiaya-health-server' }
  }
}
