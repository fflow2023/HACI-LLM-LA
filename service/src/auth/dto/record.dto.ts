import { IsString, IsNotEmpty } from 'class-validator';

export class CreateRecordDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  answer: string; // 允许空字符串但必须有值
}