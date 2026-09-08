import type {
  BloodPressureListResponse,
  BloodPressureRecordDTO,
  BloodPressureSummaryDTO,
  CreateBloodPressureRecordResponse,
} from '@bp/contracts'
import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
  type Type,
} from '@nestjs/common'

import { CurrentUserParam, type CurrentUser } from '../common/auth/current-user.decorator'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { AnalysisService } from '../analysis/analysis.service'
import { BloodPressureSummaryQueryDto } from '../analysis/dto/blood-pressure-summary-query.dto'
import { BloodPressureService } from './blood-pressure.service'
import { BloodPressureListQueryDto } from './dto/blood-pressure-list-query.dto'
import { CreateBloodPressureDto } from './dto/create-blood-pressure.dto'
import { UpdateBloodPressureDto } from './dto/update-blood-pressure.dto'

function bloodPressureValidationPipe(expectedType: Type<unknown>): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    expectedType,
    exceptionFactory: (errors) =>
      new BadRequestException({
        code: 'INVALID_BP_READING',
        message: '血压记录参数无效',
        details: { fields: errors.map((error) => error.property) },
      }),
  })
}

@Controller('blood-pressure')
@UseGuards(JwtAuthGuard)
export class BloodPressureController {
  constructor(
    @Inject(BloodPressureService) private readonly service: BloodPressureService,
    @Inject(AnalysisService) private readonly analysisService: AnalysisService,
  ) {}

  @Post()
  create(
    @CurrentUserParam() user: CurrentUser,
    @Body(bloodPressureValidationPipe(CreateBloodPressureDto))
    body: CreateBloodPressureDto,
  ): Promise<CreateBloodPressureRecordResponse> {
    return this.service.create(user.userId, body)
  }

  @Get()
  list(
    @CurrentUserParam() user: CurrentUser,
    @Query(bloodPressureValidationPipe(BloodPressureListQueryDto))
    query: BloodPressureListQueryDto,
  ): Promise<BloodPressureListResponse> {
    return this.service.list(user.userId, query)
  }

  @Get('summary')
  summary(
    @CurrentUserParam() user: CurrentUser,
    @Query(new ValidationPipe({ transform: true, whitelist: true, expectedType: BloodPressureSummaryQueryDto }))
    query: BloodPressureSummaryQueryDto,
  ): Promise<BloodPressureSummaryDTO> {
    return this.analysisService.getBloodPressureSummary(user.userId, query.profileId, query.range)
  }

  @Get(':id')
  get(@CurrentUserParam() user: CurrentUser, @Param('id') id: string): Promise<BloodPressureRecordDTO> {
    return this.service.get(user.userId, id)
  }

  @Patch(':id')
  update(
    @CurrentUserParam() user: CurrentUser,
    @Param('id') id: string,
    @Body(bloodPressureValidationPipe(UpdateBloodPressureDto))
    body: UpdateBloodPressureDto,
  ): Promise<BloodPressureRecordDTO> {
    return this.service.update(user.userId, id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUserParam() user: CurrentUser, @Param('id') id: string): Promise<void> {
    await this.service.remove(user.userId, id)
  }
}
