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
        'Observaciones',
        'Confirmado',
        'Fecha Entrega',
        'Hora Entrega',
        'Entregado'
      ]);
      
      // Formatear encabezados
      const headerRange = sheet.getRange(1, 1, 1, 16);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('#ffffff');
    }
    
    // Parsear los datos recibidos
    const data = JSON.parse(e.postData.contents);
    
    // Preparar los datos para insertar
    // Usar saltos de línea para que se vea mejor en la hoja
    const currentDate = new Date();
    const row = [
      currentDate, // Fecha y Hora
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
      data.observations || '',
      false, // Confirmado - checkbox (false por defecto)
      currentDate, // Fecha Entrega - fecha de hoy
      currentDate, // Hora Entrega - hora actual (se formateará después)
      'En elaboración' // Entregado - valor por defecto
    ];
    
    // Obtener la última fila con datos antes de agregar
    const lastRowBefore = sheet.getLastRow();
    
    // Calcular el número de la nueva fila (después de la última fila con datos)
    const newRowNumber = lastRowBefore + 1;
    
    // Insertar una nueva fila después de la última fila con datos
    sheet.insertRowAfter(lastRowBefore);
    
    // Establecer los valores en la nueva fila
    const newRowRange = sheet.getRange(newRowNumber, 1, 1, row.length);
    newRowRange.setValues([row]);
    
    // Usar la nueva fila para el resto de las operaciones
    const lastRow = newRowNumber;
    
    // Configurar el formato de las celdas para que respeten los saltos de línea
    const range = sheet.getRange(lastRow, 1, 1, 16);
    range.setWrap(true); // Permitir ajuste de texto
    
    // Ajustar altura de fila para mostrar múltiples líneas
    const cellHeight = 20; // Altura base
    const regularPackagesLines = (data.regularPackages || '').split('\n').length;
    const designsLines = (data.designs || '').split('\n').length;
    const jengibrePackagesLines = (data.jengibrePackages || '').split('\n').length;
    const maxLines = Math.max(regularPackagesLines, designsLines, jengibrePackagesLines, 1);
    const rowHeight = cellHeight + (maxLines - 1) * 20;
    sheet.setRowHeight(lastRow, rowHeight);
    
    // Configurar columna "Confirmado" (columna 13) - Checkbox
    const confirmadoCell = sheet.getRange(lastRow, 13);
    confirmadoCell.insertCheckboxes();
    confirmadoCell.setValue(false); // Por defecto sin marcar
    
    // Configurar columna "Fecha Entrega" (columna 14) - Campo de fecha
    const fechaEntregaCell = sheet.getRange(lastRow, 14);
    fechaEntregaCell.setValue(currentDate);
    fechaEntregaCell.setNumberFormat('dd/mm/yyyy'); // Formato de fecha
    
    // Configurar columna "Hora Entrega" (columna 15) - Campo de hora
    const horaEntregaCell = sheet.getRange(lastRow, 15);
    horaEntregaCell.setValue(currentDate);
    horaEntregaCell.setNumberFormat('hh:mm'); // Formato de hora (24 horas)
    // Alternativa para formato 12 horas: 'hh:mm AM/PM'
    
    // Configurar columna "Entregado" (columna 16) - Dropdown con opciones
    const entregadoCell = sheet.getRange(lastRow, 16);
    const validationRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['SI', 'No', 'En elaboración'], true)
      .setAllowInvalid(false)
      .build();
    entregadoCell.setDataValidation(validationRule);
    entregadoCell.setValue('En elaboración'); // Valor por defecto
    
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

