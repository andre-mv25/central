import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { HistorialService } from './historial.service';
import { CreateHistorialDto } from './dto/create-historial.dto';
import { QueryHistorialDto } from './dto/query-historial.dto';

@Controller('historial')
export class HistorialController {
  constructor(private readonly service: HistorialService) {}

  @Post()
  crear(@Body() dto: CreateHistorialDto, @CurrentUser() user: AuthUser) {
    return this.service.registrar({ ...dto, usuarioId: user.id });
  }

  @Get()
  listar(@Query() query: QueryHistorialDto) {
    return this.service.listar(query);
  }

  @Delete('limpiar')
  limpiar(@Query('dias', new ParseIntPipe({ optional: true })) dias?: number) {
    return this.service.limpiar(dias ?? 3);
  }
}
