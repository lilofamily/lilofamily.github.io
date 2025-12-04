/**
 * GOOGLE APPS SCRIPT - Código para pegar en Google Apps Script
 * 
 * INSTRUCCIONES:
 * 1. Abre tu hoja de cálculo de Google
 * 2. Ve a Extensiones > Apps Script
 * 3. Pega este código completo
 * 4. Guarda el proyecto (Ctrl+S o Cmd+S)
 * 5. Haz clic en "Desplegar" > "Nueva implementación"
 * 6. Selecciona tipo: "Aplicación web"
 * 7. Ejecutar como: "Yo"
 * 8. Quién tiene acceso: "Cualquiera"
 * 9. Haz clic en "Desplegar"
 * 10. Copia la URL que se genera (algo como: https://script.google.com/macros/s/...)
 * 11. Pega esa URL en la variable GOOGLE_SHEETS_WEB_APP_URL en script.js
 */

function doPost(e) {
  try {
    // Obtener la hoja activa (o cambiar 'Sheet1' por el nombre de tu hoja)
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Si la hoja está vacía, agregar encabezados
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Fecha y Hora',
        'Nombre Completo',
        'Teléfono',
        'Paquetes Regulares',
        'Cantidad Regular',
        'Diseños Seleccionados',
        'Paquetes Jengibre',
        'Cantidad Jengibre',
        'Monto Depositado',
        'Monto Restante',
        'Total',
        'Observaciones'
      ]);
    }
    
    // Parsear los datos recibidos
    const data = JSON.parse(e.postData.contents);
    
    // Preparar los datos para insertar
    // Usar saltos de línea para que se vea mejor en la hoja
    const row = [
      new Date(), // Fecha y Hora
      data.fullName || '',
      data.phone || '',
      data.regularPackages || '', // Ya viene con saltos de línea desde script.js
      data.regularQuantity || 0,
      data.designs || '', // Ya viene con saltos de línea desde script.js
      data.jengibrePackages || '', // Ya viene con saltos de línea desde script.js
      data.jengibreQuantity || 0,
      data.depositAmount || 0,
      data.remainingAmount || 0,
      data.totalPrice || 0,
      data.observations || ''
    ];
    
    // Agregar la fila a la hoja
    const lastRow = sheet.appendRow(row);
    
    // Configurar el formato de las celdas para que respeten los saltos de línea
    const range = sheet.getRange(lastRow, 1, 1, 12);
    range.setWrap(true); // Permitir ajuste de texto
    
    // Ajustar altura de fila para mostrar múltiples líneas
    const cellHeight = 20; // Altura base
    const regularPackagesLines = (data.regularPackages || '').split('\n').length;
    const designsLines = (data.designs || '').split('\n').length;
    const jengibrePackagesLines = (data.jengibrePackages || '').split('\n').length;
    const maxLines = Math.max(regularPackagesLines, designsLines, jengibrePackagesLines, 1);
    const rowHeight = cellHeight + (maxLines - 1) * 20;
    sheet.setRowHeight(lastRow, rowHeight);
    
    // Retornar respuesta exitosa
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Pedido registrado correctamente' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Retornar error
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Función de prueba (opcional)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'OK', message: 'Google Apps Script funcionando correctamente' }))
    .setMimeType(ContentService.MimeType.JSON);
}

