import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from '../../config/database.constants';
import { Inject } from '@nestjs/common';

export interface ResumenEjecutivoData {
  fecha: string;
  ventas: {
    totalKilos: number;
    totalDinero: number;
    totalRegistros: number;
    precioPromedio: number;
    porVariedad: Array<{ variedad: string; kilos: number; dinero: number; registros: number }>;
  };
  inventario: {
    totalVariedades: number;
    stockTotal: number;
    valorTotal: number;
    requierenReposicion: Array<{ variedad: string; stockDisponible: number; stockMinimo: number; deficit: number }>;
    enCuarentena: number;
    enTransito: number;
    proximosAVencer: Array<{ variedad: string; lote: string; diasRestantes: number }>;
  };
  alertas: {
    stockCritico: number;
    preciosAnomalos: number;
    lotesVencidos: number;
  };
}

@Injectable()
export class ResumenEjecutivoService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
  ) {}

  async generarResumenDiario(fecha?: string, sucursal?: string): Promise<ResumenEjecutivoData> {
    const fechaConsulta = fecha ?? new Date().toISOString().slice(0, 10);

    // 1. Ventas del día
    const ventas = await this.obtenerVentasDia(fechaConsulta, sucursal);

    // 2. Estado de inventario
    const inventario = await this.obtenerEstadoInventario();

    // 3. Alertas
    const alertas = await this.obtenerAlertas();

    return {
      fecha: fechaConsulta,
      ventas,
      inventario,
      alertas,
    };
  }

  private async obtenerVentasDia(fecha: string, sucursal?: string) {
    const kpis = await this.pool.query(
      `SELECT COALESCE(SUM(rv.kilos), 0) AS total_kilos,
              COALESCE(SUM(rv.total), 0) AS total_dinero,
              COUNT(*) AS total_registros
         FROM registros_ventas rv
         JOIN compradores c ON c.id = rv.comprador_id
        WHERE rv.fecha = $1
          AND ($2::text IS NULL OR c.sucursal = $2)`,
      [fecha, sucursal ?? null],
    );

    const porVariedad = await this.pool.query(
      `SELECT cl.nombre_clase AS variedad,
              SUM(rv.kilos) AS kilos,
              SUM(rv.total) AS dinero,
              COUNT(*) AS registros
         FROM registros_ventas rv
         JOIN compradores c ON c.id = rv.comprador_id
         JOIN clases cl ON cl.id = rv.clase_id
        WHERE rv.fecha = $1
          AND ($2::text IS NULL OR c.sucursal = $2)
        GROUP BY cl.nombre_clase
        ORDER BY SUM(rv.kilos) DESC`,
      [fecha, sucursal ?? null],
    );

    const totalKilos = Number(kpis.rows[0]?.total_kilos ?? 0);
    const totalDinero = Number(kpis.rows[0]?.total_dinero ?? 0);
    const totalRegistros = Number(kpis.rows[0]?.total_registros ?? 0);

    return {
      totalKilos,
      totalDinero,
      totalRegistros,
      precioPromedio: totalKilos > 0 ? totalDinero / totalKilos : 0,
      porVariedad: porVariedad.rows.map(r => ({
        variedad: r.variedad,
        kilos: Number(r.kilos),
        dinero: Number(r.dinero),
        registros: Number(r.registros),
      })),
    };
  }

  private async obtenerEstadoInventario() {
    const resumen = await this.pool.query(
      `SELECT COUNT(*) AS total_variedades,
              COALESCE(SUM(stock_disponible), 0) AS stock_total,
              COALESCE(SUM(stock_disponible * costo_promedio), 0) AS valor_total
         FROM v_productos_stock
        WHERE activo = true`,
    );

    const requierenReposicion = await this.pool.query(
      `SELECT p.nombre AS variedad, p.stock_disponible, p.stock_minimo,
              (p.stock_minimo - p.stock_disponible) AS deficit
         FROM v_productos_stock p
        WHERE p.activo = true
          AND p.stock_disponible <= p.stock_minimo
        ORDER BY deficit DESC`,
    );

    const enCuarentena = await this.pool.query(
      `SELECT COUNT(*) FROM productos WHERE activo = true AND estado = 'cuarentena'`,
    );

    const enTransito = await this.pool.query(
      `SELECT COUNT(*) FROM productos WHERE activo = true AND estado = 'en_transito'`,
    );

    const proximosAVencer = await this.pool.query(
      `SELECT p.nombre AS variedad, p.numero_lote AS lote,
              (p.fecha_caducidad - CURRENT_DATE) AS dias_restantes
         FROM productos p
        WHERE p.activo = true
          AND p.fecha_caducidad IS NOT NULL
          AND p.fecha_caducidad >= CURRENT_DATE
          AND p.fecha_caducidad <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY p.fecha_caducidad ASC
        LIMIT 10`,
    );

    return {
      totalVariedades: Number(resumen.rows[0]?.total_variedades ?? 0),
      stockTotal: Number(resumen.rows[0]?.stock_total ?? 0),
      valorTotal: Number(resumen.rows[0]?.valor_total ?? 0),
      requierenReposicion: requierenReposicion.rows.map(r => ({
        variedad: r.variedad,
        stockDisponible: Number(r.stock_disponible),
        stockMinimo: Number(r.stock_minimo),
        deficit: Number(r.deficit),
      })),
      enCuarentena: Number(enCuarentena.rows[0]?.count ?? 0),
      enTransito: Number(enTransito.rows[0]?.count ?? 0),
      proximosAVencer: proximosAVencer.rows.map(r => ({
        variedad: r.variedad,
        lote: r.lote,
        diasRestantes: Number(r.dias_restantes),
      })),
    };
  }

  private async obtenerAlertas() {
    const stockCritico = await this.pool.query(
      `SELECT COUNT(*) FROM v_productos_stock WHERE activo = true AND stock_disponible <= 0`,
    );

    const preciosAnomalos = await this.pool.query(
      `SELECT COUNT(*) FROM (
         SELECT rv.*, 
                LAG(rv.precio) OVER (PARTITION BY rv.clase_id ORDER BY rv.creado_at) AS precio_anterior
         FROM registros_ventas rv
         WHERE rv.fecha >= CURRENT_DATE - INTERVAL '7 days'
       ) sub
       WHERE precio_anterior IS NOT NULL
         AND precio_anterior > 0
         AND ABS(sub.precio - precio_anterior) / precio_anterior > 0.3`,
    );

    const lotesVencidos = await this.pool.query(
      `SELECT COUNT(*) FROM productos 
       WHERE activo = true 
         AND fecha_caducidad IS NOT NULL 
         AND fecha_caducidad < CURRENT_DATE`,
    );

    return {
      stockCritico: Number(stockCritico.rows[0]?.count ?? 0),
      preciosAnomalos: Number(preciosAnomalos.rows[0]?.count ?? 0),
      lotesVencidos: Number(lotesVencidos.rows[0]?.count ?? 0),
    };
  }

  // Generar narrativa con IA (Groq)
  async generarNarrativa(data: ResumenEjecutivoData): Promise<string> {
    const apiKey = this.config.get<string>('groq.apiKey');
    if (!apiKey) {
      return this.generarNarrativaFallback(data);
    }

    try {
      const prompt = this.construirPrompt(data);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente ejecutivo para una empresa de venta de papa. Genera UN SOLO PÁRRAFO ejecutivo (máx. 120 palabras) en español mexicano, tono profesional pero directo. Incluye: ventas totales (toneladas), variedades principales, stock crítico, alertas clave. Sin saludos ni despedidas.'
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      const json = await response.json();
      return json.choices?.[0]?.message?.content?.trim() ?? this.generarNarrativaFallback(data);
    } catch {
      return this.generarNarrativaFallback(data);
    }
  }

  private construirPrompt(data: ResumenEjecutivoData): string {
    const topVariedades = data.ventas.porVariedad.slice(0, 3).map(v => `${v.variedad} (${(v.kilos/1000).toFixed(1)} ton)`).join(', ');
    const criticas = data.inventario.requierenReposicion.slice(0, 3).map(r => `${r.variedad} (disp: ${r.stockDisponible.toFixed(1)}/${r.stockMinimo.toFixed(1)})`).join(', ');
    const vencen = data.inventario.proximosAVencer.slice(0, 2).map(v => `${v.variedad} lote ${v.lote} (${v.diasRestantes}d)`).join(', ');

    return `
Fecha: ${data.fecha}
VENTAS: ${(data.ventas.totalKilos/1000).toFixed(1)} ton | $${data.ventas.totalDinero.toLocaleString()} | ${data.ventas.totalRegistros} registros | Precio prom: $${data.ventas.precioPromedio.toFixed(2)}/kg
Top variedades: ${topVariedades || 'Ninguna'}
INVENTARIO: ${data.inventario.totalVariedades} variedades | Stock total: ${data.inventario.stockTotal.toFixed(1)} kg | Valor: $${data.inventario.valorTotal.toLocaleString()}
REPOSICIÓN URGENTE: ${criticas || 'Ninguna'}
EN CUARENTENA: ${data.inventario.enCuarentena} | EN TRÁNSITO: ${data.inventario.enTransito}
PRÓXIMOS A VENCER: ${vencen || 'Ninguno'}
ALERTAS: Stock crítico ${data.alertas.stockCritico} | Precios anómalos ${data.alertas.preciosAnomalos} | Lotes vencidos ${data.alertas.lotesVencidos}
`.trim();
  }

  private generarNarrativaFallback(data: ResumenEjecutivoData): string {
    const ton = (data.ventas.totalKilos / 1000).toFixed(1);
    const topVar = data.ventas.porVariedad.slice(0, 2).map(v => v.variedad).join(', ') || 'ninguna';
    const criticas = data.inventario.requierenReposicion.slice(0, 2).map(r => `${r.variedad} (${r.stockDisponible.toFixed(1)}/${r.stockMinimo.toFixed(1)} kg)`).join(', ') || 'ninguna';
    const vencen = data.inventario.proximosAVencer[0] ? `${data.inventario.proximosAVencer[0].variedad} lote ${data.inventario.proximosAVencer[0].lote} (${data.inventario.proximosAVencer[0].diasRestantes}d)` : 'ninguno';

    return `Hoy se vendieron ${ton} ton (${data.ventas.totalRegistros} registros, $${data.ventas.totalDinero.toLocaleString()}) principalmente de ${topVar}. Inventario: ${data.inventario.totalVariedades} variedades activas, ${data.inventario.stockTotal.toFixed(0)} kg totales ($${data.inventario.valorTotal.toLocaleString()}). Requieren reposición: ${criticas}. En cuarentena: ${data.inventario.enCuarentena}, en tránsito: ${data.inventario.enTransito}. Próximos a vencer: ${vencen}. Alertas: ${data.alertas.stockCritico} stock crítico, ${data.alertas.preciosAnomalos} precios anómalos, ${data.alertas.lotesVencidos} lotes vencidos.`;
  }
}