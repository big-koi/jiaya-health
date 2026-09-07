import { ValidationPipe, type INestApplication } from '@nestjs/common'

import { ApiErrorFilter } from './common/errors/api-error.filter'

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  app.useGlobalFilters(new ApiErrorFilter())
}
