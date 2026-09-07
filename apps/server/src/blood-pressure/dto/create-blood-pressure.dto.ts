import { Type } from 'class-transformer'
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

class MeasurementContextDto {
  @IsOptional() @IsIn(['before', 'after']) medication?: 'before' | 'after'
  @IsOptional() @IsIn(['sitting', 'standing', 'lying']) posture?: 'sitting' | 'standing' | 'lying'
  @IsOptional() @IsIn(['left', 'right']) arm?: 'left' | 'right'
}

export class CreateBloodPressureDto {
  @IsString() @IsNotEmpty() profileId!: string
  @IsInt() @Min(40) @Max(300) systolic!: number
  @IsInt() @Min(30) @Max(200) diastolic!: number
  @IsOptional() @IsInt() @Min(20) @Max(250) pulse?: number
  @IsDateString() measuredAt!: string
  @IsIn(['self', 'family']) source!: 'self' | 'family'

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MeasurementContextDto)
  measurementContext?: MeasurementContextDto | null

  @IsOptional() @IsString() note?: string | null
}
