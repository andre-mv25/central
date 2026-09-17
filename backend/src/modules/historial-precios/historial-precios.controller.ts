import { Controller, Get, Query } from '@nestjs/common';
import { HistorialPreciosService } from './historial-precios.service';
import { SugerenciaPrecioQueryDto } from './dto/sugerencia-precio-query.dto';

@Controller('historial-precios')
export class HistorialPreciosController {
  constructor(private readonly service: HistorialPreciosService) {}

  @Get('sugerencia')
  sugerencia(@Query() query: SugerenciaPrecioQueryDto) {
    return this.service.evaluarPrecio(query.claseId, query.calidadId, query.precio);
  }

  @Get()
  historial(@Query() query: SugerenciaPrecioQueryDto) {
    return this.service.findHistorial(query.claseId, query.calidadId);
  }
}
