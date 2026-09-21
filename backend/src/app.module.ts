import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { DatabaseModule } from './config/database.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { RolesModule } from './modules/roles/roles.module';
import { CompradoresModule } from './modules/compradores/compradores.module';
import { ClasesModule } from './modules/clases/clases.module';
import { CalidadesModule } from './modules/calidades/calidades.module';
import { RegistrosVentasModule } from './modules/registros-ventas/registros-ventas.module';
import { HistorialPreciosModule } from './modules/historial-precios/historial-precios.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    DatabaseModule,
    AuthModule,
    UsuariosModule,
    RolesModule,
    CompradoresModule,
    ClasesModule,
    CalidadesModule,
    RegistrosVentasModule,
    HistorialPreciosModule,
    ReportesModule,
    InventarioModule,
    RealtimeModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
