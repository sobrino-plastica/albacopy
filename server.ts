import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const MAX_PDF_SIZE = 25 * 1024 * 1024;

function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.replace(/^['"]|['"]$/g, '').trim();
}

function getRecipientEmail(): string {
  // Destinatario fijo: no se expone ni se puede modificar desde el formulario.
  return 'conserjeria.ies.albalat@educarex.es';
}

function normalizeCopiesCount(value: unknown): number {
  const parsed = Number(String(value ?? '').trim());
  if (!Number.isFinite(parsed)) return 0;
  return Math.floor(parsed);
}

// Lazy initialized Gemini client
let genAiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genAiClient && process.env.GEMINI_API_KEY) {
    try {
      genAiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
      console.warn('Failed to initialize GoogleGenAI client:', err);
      return null;
    }
  }
  return genAiClient;
}

async function startServer() {
  const app = express();

  // JSON is only used by the optional AI endpoint. PDF uploads use multipart/form-data.
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    const resendConfigured = Boolean(
      cleanEnv(process.env.RESEND_API_KEY) ||
      (cleanEnv(process.env.SMTP_HOST) && cleanEnv(process.env.SMTP_USER) && cleanEnv(process.env.SMTP_PASS))
    );

    res.json({
      status: 'ok',
      fixedRecipient: getRecipientEmail(),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasResendConfigured: resendConfigured,
      maxPdfSizeMb: 25,
    });
  });

  // AI Assistant endpoint
  app.post('/api/ai/optimize', async (req: Request, res: Response) => {
    try {
      const {
        teacherCode,
        teacherName,
        copiesCount,
        purpose,
        options,
        pdfName,
      } = req.body;

      const recipient = getRecipientEmail();
      const purposeText = purpose === 'alumnado' ? 'Copias para alumnado' : 'Uso personal';
      const prompt = `Eres un asistente de secretaría/conserjería para el IES Albalat de Extremadura.
Un profesor va a enviar una solicitud formal de fotocopias a la conserjería del centro (${recipient}).
Los datos de la petición son:
- Código de profesor: ${teacherCode || 'Sin especificar'}
- Nombre/Profesor: ${teacherName || 'No indicado'}
- Número de copias: ${copiesCount || 1}
- Fin de las copias: ${purposeText}
- Opciones de impresión: ${options?.doubleSided ? 'Doble cara' : 'Una sola cara'}, Papel ${options?.paperSize || 'A4'}, ${options?.colorMode === 'color' ? 'Color' : 'Blanco y Negro'}, ${options?.stapled ? 'Grapado' : 'Sin grapar'}, Urgencia: ${options?.urgency || 'Normal'}
- Observaciones extra: ${options?.notes || 'Ninguna'}
- Archivo adjunto: ${pdfName || 'Documento PDF'}

Por favor, genera una respuesta JSON con la siguiente estructura exacta (sin formato markdown adicional):
{
  "subject": "[COPIAS IES ALBALAT] Código Prof: ${teacherCode || 'XXX'} - ${copiesCount} copias (${purposeText})",
  "body": "Texto formal, educado y muy claro dirigido al personal de conserjería indicando todos los detalles necesarios para realizar las copias correctamente.",
  "summary": "Resumen conciso en 1 frase de la petición.",
  "recommendations": ["Consejo 1", "Consejo 2"]
}`;

      const ai = getGeminiClient();
      if (ai) {
        try {
          const geminiResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          });

          const responseText = geminiResponse.text?.trim() || '{}';
          const parsed = JSON.parse(responseText);
          return res.json({ success: true, data: parsed });
        } catch (apiError: any) {
          console.warn('Gemini API call failed, falling back to local template:', apiError?.message);
        }
      }

      const fallbackSubject = `[FOTOCOPIAS IES ALBALAT] Prof. ${teacherCode || 'Profesor'} - ${copiesCount} copias (${purposeText})`;
      const fallbackBody = `Estimado equipo de conserjería del IES Albalat,\n\n` +
        `Les solicito la impresión del documento PDF adjunto (${pdfName || 'archivo.pdf'}) con los siguientes datos:\n\n` +
        `• Código de profesor: ${teacherCode || 'N/A'}${teacherName ? ` (${teacherName})` : ''}\n` +
        `• Número de ejemplares: ${copiesCount}\n` +
        `• Fin de las copias: ${purposeText}\n` +
        `• Formato: ${options?.paperSize || 'A4'} - ${options?.doubleSided ? 'A doble cara' : 'Una cara'}\n` +
        `• Modo: ${options?.colorMode === 'color' ? 'Color' : 'Blanco y Negro'}\n` +
        `• Acabado: ${options?.stapled ? 'Grapado en esquina' : 'Sin grapar'}\n` +
        (options?.notes ? `• Observaciones: ${options.notes}\n` : '') +
        `\nMuchas gracias por su labor.\nUn cordial saludo.`;

      return res.json({
        success: true,
        data: {
          subject: fallbackSubject,
          body: fallbackBody,
          summary: `Solicitud de ${copiesCount} copias de ${pdfName || 'PDF'} para ${purposeText}.`,
          recommendations: [
            options?.doubleSided
              ? 'Se ha seleccionado doble cara: ahorra un 50% de papel en el centro.'
              : 'Consejo: considerar la impresión a doble cara para reducir el consumo de papel.',
            'Entregar con antelación suficiente al inicio de las clases lectivas.',
          ],
        },
      });
    } catch (err: any) {
      console.error('Error in /api/ai/optimize:', err);
      res.status(500).json({ success: false, error: err.message || 'Error processing request' });
    }
  });

  // The production email endpoint lives in api/send-email.ts for Vercel.
  // Handle Express body-parser errors, including PDFs larger than 25 MB.
  app.use((err: any, _req: Request, res: Response, next: Function) => {
    if (err?.type === 'entity.too.large' || err?.status === 413) {
      return res.status(413).json({ success: false, error: 'El PDF supera el límite de 25 MB.' });
    }
    if (err) {
      console.error('Unhandled server error:', err?.message || err);
      return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
    next();
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor IES Albalat Copias activo en http://0.0.0.0:${PORT}`);
    console.log(`Destinatario fijo: ${getRecipientEmail()}`);
    console.log(`Límite PDF: ${MAX_PDF_SIZE / (1024 * 1024)} MB`);
  });
}

startServer();
