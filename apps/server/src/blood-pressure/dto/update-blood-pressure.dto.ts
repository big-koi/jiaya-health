import { Type } from 'class-transformer'
import {
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

class UpdateMeasurementContextDto {
  @IsOptional() @IsIn(['before', 'after']) medication?: 'before' | 'after'
  @IsOptional() @IsIn(['sitting', 'standing', 'lying']) posture?: 'sitting' | 'standing' | 'lying'
  @IsOptional() @IsIn(['left', 'right']) arm?: 'left' | 'right'
}

export class UpdateBloodPressureDto {
  @IsOptional() @IsInt() @Min(40) @Max(300) systolic?: number
  @IsOptional() @IsInt() @Min(30) @Max(200) diastolic?: number
  @IsOptional() @IsInt() @Min(20) @Max(250) pulse?: number | null
  @IsOptional() @IsDateString() measuredAt?: string

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateMeasurementContextDto)
  measurementContext?: UpdateMeasurementContextDto | null

  @IsOptional() @IsString() note?: string | null
}
