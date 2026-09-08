import { IsIn, IsNotEmpty, IsString } from 'class-validator'

export class BloodPressureSummaryQueryDto {
  @IsString() @IsNotEmpty() profileId!: string
  @IsIn(['7d', '30d']) range!: '7d' | '30d'
}
