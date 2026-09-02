# 📄 Petición de Fotocopias — IES Albalat

Aplicación web para gestionar y enviar peticiones de fotocopias al buzón fijo de conserjería del **IES Albalat**.

## Características

- Formulario para correo Educarex, código de profesor/a, número de copias y curso/grupo.
- Destinatario fijo: `conserjeria.ies.albalat@educarex.es`.
- PDF de hasta **25 MB**.
- El PDF se transmite desde el navegador al servidor como **binario real (`application/pdf`)**: no se convierte a Base64 en el navegador ni se mete dentro de JSON.
- Barra de progreso real durante la subida del PDF.
- Envío mediante **Resend SMTP** y Nodemailer.
- El código de profesor y el número de copias que llegan al correo se toman de los valores enviados en esa petición; no existe un código de reserva como `PR-01` ni un número de referencia automático.
- Si Resend falla, la aplicación muestra error: **no** presenta una petición fallida como si se hubiera enviado.
- `Reply-To` apunta al correo Educarex introducido por el docente.

## Resend

La aplicación utiliza el relay SMTP de Resend:

- Host: `smtp.resend.com`
- Puerto recomendado: `465`
- Usuario: `resend`
- Contraseña: API Key de Resend

Resend documenta oficialmente esta configuración SMTP y su integración con Nodemailer.

**Importante:** para enviar a `conserjeria.ies.albalat@educarex.es`, la dirección de `SMTP_FROM` debe pertenecer a un dominio verificado en Resend. El dominio de prueba `resend.dev` solo sirve para pruebas dirigidas al correo de la propia cuenta. Consulta la documentación de Resend para verificar el dominio.

## Variables de entorno en Render

Configura estas variables en **Render → Environment**:

```text
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
SMTP_FROM=Copias IES Albalat <copias@TU-DOMINIO-VERIFICADO.ES>
```

Opcionalmente puedes dejar explícitos los valores SMTP:

```text
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
```

También puedes configurar:

```text
GEMINI_API_KEY=
```

El destinatario **no se configura desde el navegador** y el servidor lo fija siempre a:

```text
conserjeria.ies.albalat@educarex.es
```

## Desarrollo local

```bash
npm install
npm run dev
```

## Producción en Render

- Build Command: `npm run build`
- Start Command: `npm start`

No es necesario instalar ninguna dependencia adicional para el transporte del PDF: el servidor usa el parser binario de Express y Nodemailer.

## Límite del PDF

El límite de la aplicación es **25 MB por PDF**. Resend admite mensajes de hasta 40 MB, por lo que 25 MB deja margen para la codificación MIME del adjunto y el resto del mensaje.
