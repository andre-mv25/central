import { Controller, Get, Query } from '@nestjs/common';
import { ClasesRepository } from '../clases/clases.repository';
import { CalidadesRepository } from '../calidades/calidades.repository';
import { HistorialPreciosService } from './historial-precios.service';
import { SugerenciaPrecioQueryDto } from './dto/sugerencia-precio-query.dto';

@Controller('historial-precios')
export class HistorialPreciosController {
  constructor(
    private readonly service: HistorialPreciosService,
    private readonly clasesRepository: ClasesRepository,
    private readonly calidadesRepository: CalidadesRepository,
  ) {}

  @Get('sugerencia')
  async sugerencia(@Query() query: SugerenciaPrecioQueryDto) {
    let claseId = query.claseId;
    let calidadId = query.calidadId;

    if (query.clase) {
      const clase = await this.clasesRepository.findByName(query.clase.trim());
      const calidad = await this.calidadesRepository.findByName(query.calidad?.trim() || 'Estándar');
      if (!clase || !calidad) {
        return this.service.evaluacionSinHistorial();
      }
      claseId = clase.id;
      calidadId = calidad.id;
    }

    if (claseId === undefined || calidadId === undefined) {
      return this.service.evaluacionSinHistorial();
    }

    return this.service.evaluarPrecio(claseId, calidadId, query.precio);
  }

  @Get()
  historial(@Query() query: SugerenciaPrecioQueryDto) {
    return this.service.findHistorial(query.claseId!, query.calidadId!);
  }
}
