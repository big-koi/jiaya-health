import type { MeasurementReminderDTO } from '@bp/contracts'
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, UseGuards, ValidationPipe, type Type } from '@nestjs/common'

import { CurrentUserParam, type CurrentUser } from '../common/auth/current-user.decorator'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { CreateReminderDto } from './dto/create-reminder.dto'
import { ReminderListQueryDto } from './dto/reminder-list-query.dto'
import { UpdateReminderDto } from './dto/update-reminder.dto'
import { RemindersService } from './reminders.service'

function reminderValidationPipe(expectedType: Type<unknown>): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    expectedType,
    exceptionFactory: (errors) =>
      new BadRequestException({
        code: 'INVALID_REMINDER',
        message: '测量提醒参数无效',
        details: { fields: errors.map((error) => error.property) },
      }),
  })
}

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(@Inject(RemindersService) private readonly service: RemindersService) {}

  @Post()
  create(
    @CurrentUserParam() user: CurrentUser,
    @Body(reminderValidationPipe(CreateReminderDto)) body: CreateReminderDto,
  ): Promise<MeasurementReminderDTO> {
    return this.service.create(user.userId, body)
  }

  @Get()
  list(
    @CurrentUserParam() user: CurrentUser,
    @Query(reminderValidationPipe(ReminderListQueryDto)) query: ReminderListQueryDto,
  ): Promise<MeasurementReminderDTO[]> {
    return this.service.list(user.userId, query.profileId)
  }

  @Patch(':id')
  update(
    @CurrentUserParam() user: CurrentUser,
    @Param('id') id: string,
    @Body(reminderValidationPipe(UpdateReminderDto)) body: UpdateReminderDto,
  ): Promise<MeasurementReminderDTO> {
    return this.service.update(user.userId, id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUserParam() user: CurrentUser, @Param('id') id: string): Promise<void> {
    await this.service.remove(user.userId, id)
  }
}
