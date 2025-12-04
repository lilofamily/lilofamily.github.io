# Instrucciones para Configurar Google Sheets

## Paso 1: Crear la Hoja de Cálculo

1. Ve a [Google Sheets](https://sheets.google.com)
2. Crea una nueva hoja de cálculo
3. Nómbrala como quieras (ej: "Pedidos Chocobombas K-boom")

## Paso 2: Configurar Google Apps Script

1. En tu hoja de cálculo, ve a **Extensiones** > **Apps Script**
2. Se abrirá una nueva pestaña con el editor de Apps Script
3. Elimina el código que viene por defecto
4. Copia y pega TODO el contenido del archivo `google-apps-script.js`
5. Guarda el proyecto (Ctrl+S o Cmd+S)
6. Nombra el proyecto (ej: "Registro de Pedidos")

## Paso 3: Desplegar como Aplicación Web

1. En el editor de Apps Script, haz clic en **Desplegar** > **Nueva implementación**
2. Haz clic en el icono de engranaje ⚙️ junto a "Seleccionar tipo"
3. Selecciona **Aplicación web**
4. Configura:
   - **Descripción**: "Registro de pedidos de Chocobombas"
   - **Ejecutar como**: "Yo"
   - **Quién tiene acceso**: "Cualquiera"
5. Haz clic en **Desplegar**
6. Autoriza los permisos cuando se te solicite:
   - Haz clic en "Revisar permisos"
   - Selecciona tu cuenta de Google
   - Haz clic en "Avanzado"
   - Haz clic en "Ir a [nombre del proyecto] (no es seguro)" (esto es normal para scripts personales)
   - Haz clic en "Permitir"
7. **IMPORTANTE**: Copia la URL que aparece (algo como: `https://script.google.com/macros/s/AKfycby.../exec`)

## Paso 4: Configurar en el Sitio Web

1. Abre el archivo `script.js` en tu proyecto
2. Busca la línea que dice:
   ```javascript
   const GOOGLE_SHEETS_WEB_APP_URL = '';
   ```
3. Pega la URL que copiaste entre las comillas:
   ```javascript
   const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby.../exec';
   ```
4. Guarda el archivo

## Paso 5: Probar

1. Realiza un pedido de prueba en tu sitio web
2. Haz clic en "Realizar Pedido"
3. Verifica que se abra WhatsApp
4. Ve a tu hoja de cálculo y verifica que se haya creado una nueva fila con los datos del pedido

## Estructura de Datos que se Guardarán

La hoja de cálculo tendrá las siguientes columnas:

- **Fecha y Hora**: Fecha y hora del pedido
- **Nombre Completo**: Nombre del cliente
- **Teléfono**: Número de teléfono
- **Paquetes Regulares**: Lista de paquetes regulares seleccionados
- **Cantidad Regular**: Total de chocobombas regulares
- **Diseños Seleccionados**: Lista de diseños o "Surtido"
- **Paquetes Jengibre**: Lista de paquetes de jengibre
- **Cantidad Jengibre**: Total de chocobombas de jengibre
- **Monto Depositado**: Monto del adelanto
- **Monto Restante**: Monto pendiente de pago
- **Total**: Total del pedido
- **Observaciones**: Observaciones del cliente

## Notas Importantes

- La primera vez que se ejecute, se crearán automáticamente los encabezados
- Los datos se agregan en tiempo real cuando el usuario hace clic en "Realizar Pedido"
- Si no configuras la URL, el sitio seguirá funcionando normalmente, solo no se guardarán los datos en Sheets
- Puedes personalizar el nombre de la hoja en el código de Apps Script cambiando `getActiveSheet()` por `getSheetByName('NombreDeTuHoja')`

