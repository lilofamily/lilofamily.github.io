/**
 * GOOGLE APPS SCRIPT - Código para pegar en Google Apps Script
 * 
 * INSTRUCCIONES:
 * 1. Abre tu hoja de cálculo de Google
 * 2. Ve a Extensiones > Apps Script
 * 3. Pega este código completo
 * 4. IMPORTANTE: Configura tu email de notificaciones
 *    - Busca la línea: const recipientEmail = 'tu-email@gmail.com';
 *    - Cambia 'tu-email@gmail.com' por tu email real donde quieres recibir las notificaciones
 * 5. Guarda el proyecto (Ctrl+S o Cmd+S)
 * 6. Haz clic en "Desplegar" > "Nueva implementación"
 * 7. Selecciona tipo: "Aplicación web"
 * 8. Ejecutar como: "Yo"
 * 9. Quién tiene acceso: "Cualquiera"
 * 10. Haz clic en "Desplegar"
 * 11. La primera vez que uses el envío de emails, Google te pedirá autorización
 *     - Haz clic en "Revisar permisos"
 *     - Selecciona tu cuenta de Google
 *     - Haz clic en "Permitir" para autorizar el envío de emails
 * 12. Copia la URL que se genera (algo como: https://script.google.com/macros/s/...)
 * 13. Pega esa URL en la variable GOOGLE_SHEETS_WEB_APP_URL en script.js
 * 
 * NOTIFICACIONES POR EMAIL:
 * - Cada vez que se agregue un nuevo pedido, recibirás un email automático
 * - El email incluye todos los detalles del pedido
 * - Si no configuras el email, el script funcionará igual pero sin enviar notificaciones
 */

function doPost(e) {
  try {
    // Obtener la hoja activa (o cambiar 'Sheet1' por el nombre de tu hoja)
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Verificar si la hoja está vacía o si falta la columna "Jengibres de Regalo"
    const firstCheckRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const jengibresRegaloIndex = headers.indexOf('Jengibres de Regalo');
    
    if (firstCheckRow === 0) {
      // Si la hoja está vacía, agregar todos los encabezados
      sheet.appendRow([
        'Fecha y Hora',
        'Nombre Completo',
        'Teléfono',
        'Paquetes Regulares',
        'Cantidad Regular',
        'Diseños Seleccionados',
        'Jengibres de Regalo',
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
      const headerRange = sheet.getRange(1, 1, 1, 17);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('#ffffff');
    } else if (jengibresRegaloIndex === -1) {
      // Si la hoja tiene datos pero falta la columna "Jengibres de Regalo", agregarla
      // Buscar la posición después de "Diseños Seleccionados"
      const disenosIndex = headers.indexOf('Diseños Seleccionados');
      if (disenosIndex !== -1) {
        // Insertar la columna después de "Diseños Seleccionados" (columna 7)
        sheet.insertColumnAfter(disenosIndex + 1);
        // Agregar el encabezado
        sheet.getRange(1, disenosIndex + 2).setValue('Jengibres de Regalo');
        // Formatear el nuevo encabezado
        const newHeaderCell = sheet.getRange(1, disenosIndex + 2);
        newHeaderCell.setFontWeight('bold');
        newHeaderCell.setBackground('#4285f4');
        newHeaderCell.setFontColor('#ffffff');
        
        // Agregar valores por defecto para todas las filas existentes
        const dataRows = sheet.getLastRow() - 1; // Excluir la fila de encabezados
        if (dataRows > 0) {
          const newColumnRange = sheet.getRange(2, disenosIndex + 2, dataRows, 1);
          newColumnRange.setValue('Ninguno');
        }
      }
    }
    
    // Parsear los datos recibidos
    let data;
    try {
      if (!e || !e.postData || !e.postData.contents) {
        throw new Error('No se recibieron datos en la petición');
      }
      data = JSON.parse(e.postData.contents);
      console.log('Datos parseados correctamente:', JSON.stringify(data));
    } catch (parseError) {
      console.error('Error al parsear datos:', parseError);
      throw new Error('Error al parsear los datos recibidos: ' + parseError.toString());
    }
    
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
      data.bonusJengibres || 'Ninguno', // Jengibres de Regalo
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
    const range = sheet.getRange(lastRow, 1, 1, 17);
    range.setWrap(true); // Permitir ajuste de texto
    
    // Ajustar altura de fila para mostrar múltiples líneas
    const cellHeight = 20; // Altura base
    const regularPackagesLines = (data.regularPackages || '').split('\n').length;
    const designsLines = (data.designs || '').split('\n').length;
    const jengibrePackagesLines = (data.jengibrePackages || '').split('\n').length;
    const maxLines = Math.max(regularPackagesLines, designsLines, jengibrePackagesLines, 1);
    const rowHeight = cellHeight + (maxLines - 1) * 20;
    sheet.setRowHeight(lastRow, rowHeight);
    
    // Configurar columna "Confirmado" (columna 14) - Checkbox
    const confirmadoCell = sheet.getRange(lastRow, 14);
    confirmadoCell.insertCheckboxes();
    confirmadoCell.setValue(false); // Por defecto sin marcar
    
    // Configurar columna "Fecha Entrega" (columna 15) - Campo de fecha
    const fechaEntregaCell = sheet.getRange(lastRow, 15);
    fechaEntregaCell.setValue(currentDate);
    fechaEntregaCell.setNumberFormat('dd/mm/yyyy'); // Formato de fecha
    
    // Configurar columna "Hora Entrega" (columna 16) - Campo de hora
    const horaEntregaCell = sheet.getRange(lastRow, 16);
    horaEntregaCell.setValue(currentDate);
    horaEntregaCell.setNumberFormat('hh:mm'); // Formato de hora (24 horas)
    // Alternativa para formato 12 horas: 'hh:mm AM/PM'
    
    // Configurar columna "Entregado" (columna 17) - Dropdown con opciones
    const entregadoCell = sheet.getRange(lastRow, 17);
    const validationRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['SI', 'No', 'En elaboración'], true)
      .setAllowInvalid(false)
      .build();
    entregadoCell.setDataValidation(validationRule);
    entregadoCell.setValue('En elaboración'); // Valor por defecto
    
    // Enviar notificación por email
    try {
      console.log('Intentando enviar notificación por email...');
      console.log('Datos recibidos:', JSON.stringify(data));
      console.log('Última fila:', lastRow);
      
      // Verificar que data existe antes de enviar
      if (data && typeof data === 'object') {
        sendNotificationEmail(data, lastRow);
        console.log('Función sendNotificationEmail ejecutada');
      } else {
        console.error('Error: data es undefined o no es un objeto válido');
        console.error('Tipo de data:', typeof data);
        console.error('Valor de data:', data);
      }
    } catch (emailError) {
      // Si falla el email, no afectar el proceso principal
      console.error('Error al enviar email:', emailError);
      console.error('Stack trace:', emailError.stack);
    }
    
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

// Función para enviar notificación por email cuando se agrega un nuevo pedido
function sendNotificationEmail(data, rowNumber) {
  // Validar que data existe
  if (!data || typeof data !== 'object') {
    console.error('Error: data es undefined o no es un objeto válido');
    console.error('Tipo de data:', typeof data);
    console.error('Valor de data:', data);
    return;
  }
  
  // CONFIGURACIÓN: Email donde se recibirán las notificaciones
  const recipientEmail = 'lizarraga.dev@gmail.com';
  
  console.log('sendNotificationEmail llamada con rowNumber:', rowNumber);
  console.log('recipientEmail configurado:', recipientEmail);
  console.log('Datos recibidos en sendNotificationEmail:', JSON.stringify(data));
  
  // Si no se ha configurado el email, no enviar
  if (!recipientEmail || recipientEmail === 'tu-email@gmail.com') {
    console.log('⚠️ Email no configurado. Por favor, cambia "tu-email@gmail.com" por tu email real en la línea 169 del código.');
    return;
  }
  
  // Preparar el asunto del email
  const subject = '🎄 Nuevo Pedido de Chocobombas K-boom';
  
  // Preparar el cuerpo del email con formato HTML
  let emailBody = '<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">';
  emailBody += '<h2 style="color: #c41e3a;">🎄 Nuevo Pedido Registrado</h2>';
  emailBody += '<p><strong>Se ha registrado un nuevo pedido en la fila #' + rowNumber + '</strong></p>';
  emailBody += '<hr style="border: 1px solid #ddd; margin: 20px 0;">';
  
  emailBody += '<h3 style="color: #4285f4;">📋 Datos del Cliente</h3>';
  emailBody += '<ul>';
  emailBody += '<li><strong>Nombre:</strong> ' + (data && data.fullName ? data.fullName : 'N/A') + '</li>';
  emailBody += '<li><strong>Teléfono:</strong> ' + (data && data.phone ? data.phone : 'N/A') + '</li>';
  emailBody += '</ul>';
  
  emailBody += '<h3 style="color: #4285f4;">📦 Detalle del Pedido</h3>';
  
  if (data && data.regularPackages && data.regularPackages !== 'Ninguno') {
    emailBody += '<h4>Chocobombas Regulares:</h4>';
    emailBody += '<pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">' + (data.regularPackages || 'N/A') + '</pre>';
    emailBody += '<p><strong>Cantidad:</strong> ' + (data.regularQuantity || 0) + ' unidades</p>';
  }
  
  if (data && data.designs && data.designs !== 'N/A' && data.designs !== 'Ninguno') {
    emailBody += '<h4>Diseños Seleccionados:</h4>';
    emailBody += '<pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">' + (data.designs || 'N/A') + '</pre>';
  }
  
  if (data && data.bonusJengibres && data.bonusJengibres !== 'Ninguno') {
    emailBody += '<h4>Jengibres de Regalo:</h4>';
    emailBody += '<p style="color: #daa520; font-weight: bold; font-size: 1.1em;">🎁 ' + (data.bonusJengibres || 'N/A') + '</p>';
  }

  if (data && data.jengibrePackages && data.jengibrePackages !== 'Ninguno') {
    emailBody += '<h4>Chocobombas de Jengibre:</h4>';
    emailBody += '<pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">' + (data.jengibrePackages || 'N/A') + '</pre>';
    emailBody += '<p><strong>Cantidad:</strong> ' + (data.jengibreQuantity || 0) + ' unidades</p>';
  }
  
  emailBody += '<h3 style="color: #4285f4;">💰 Información de Pago</h3>';
  emailBody += '<ul>';
  emailBody += '<li><strong>Monto Depositado:</strong> ' + (data && data.depositAmount ? data.depositAmount : 0) + ' Bs.</li>';
  emailBody += '<li><strong>Monto Restante:</strong> ' + (data && data.remainingAmount ? data.remainingAmount : 0) + ' Bs.</li>';
  emailBody += '<li><strong>Total del Pedido:</strong> <span style="color: #c41e3a; font-size: 1.2em; font-weight: bold;">' + (data && data.totalPrice ? data.totalPrice : 0) + ' Bs.</span></li>';
  emailBody += '</ul>';
  
  if (data && data.observations) {
    emailBody += '<h3 style="color: #4285f4;">📝 Observaciones</h3>';
    emailBody += '<p>' + data.observations + '</p>';
  }
  
  emailBody += '<hr style="border: 1px solid #ddd; margin: 20px 0;">';
  emailBody += '<p style="color: #666; font-size: 0.9em;">Este es un mensaje automático generado por Chocobombas K-boom</p>';
  emailBody += '<p style="color: #666; font-size: 0.9em;">Fecha y hora: ' + new Date().toLocaleString('es-BO') + '</p>';
  emailBody += '</body></html>';
  
  // Enviar el email
  try {
    console.log('Enviando email a:', recipientEmail);
    console.log('Asunto:', subject);
    
    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      htmlBody: emailBody
    });
    
    console.log('✅ Email enviado exitosamente a:', recipientEmail);
    
    // También intentar enviar al propietario de la hoja como respaldo
    try {
      const ownerEmail = SpreadsheetApp.getActiveSpreadsheet().getOwner().getEmail();
      if (ownerEmail && ownerEmail !== recipientEmail) {
        console.log('Enviando copia al propietario:', ownerEmail);
        MailApp.sendEmail({
          to: ownerEmail,
          subject: subject + ' (Copia)',
          htmlBody: emailBody
        });
      }
    } catch (ownerError) {
      console.log('No se pudo enviar copia al propietario (no crítico):', ownerError.toString());
    }
  } catch (emailSendError) {
    console.error('❌ Error al enviar email:', emailSendError);
    console.error('Tipo de error:', typeof emailSendError);
    console.error('Mensaje:', emailSendError.toString());
    
    // Verificar si es un error de permisos
    if (emailSendError.toString().includes('permission') || 
        emailSendError.toString().includes('authorization') ||
        emailSendError.toString().includes('Required permissions')) {
      console.error('⚠️ PROBLEMA DE PERMISOS:');
      console.error('1. Ejecuta la función "testEmailNotification" manualmente desde el editor');
      console.error('2. Google te pedirá autorización la primera vez');
      console.error('3. Haz clic en "Revisar permisos" y luego "Permitir"');
      console.error('4. Si no aparece la ventana de autorización, ve a:');
      console.error('   https://script.google.com/home/usersettings');
      console.error('   Y autoriza los permisos manualmente');
    } else {
      console.error('Detalles del error:', emailSendError.toString());
    }
    
    // No lanzar el error para que el pedido se guarde igual en la hoja
    // Solo registrar el error en los logs
  }
}

// Función de prueba (opcional)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'OK', message: 'Google Apps Script funcionando correctamente' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════
// FUNCIÓN PARA CREAR MENÚ EN GOOGLE SHEETS
// ═══════════════════════════════════════════════════════════════
// Esta función crea un menú en Google Sheets para autorizar permisos
// Se ejecuta automáticamente cuando abres el Google Sheet
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔔 Notificaciones')
    .addItem('📧 Probar Email (Autorizar Permisos)', 'testEmailNotification')
    .addToUi();
}

// ═══════════════════════════════════════════════════════════════
// FUNCIÓN DE PRUEBA PARA EMAIL Y AUTORIZACIÓN
// ═══════════════════════════════════════════════════════════════
// INSTRUCCIONES:
// OPCIÓN 1 (RECOMENDADA):
// 1. Abre tu Google Sheet
// 2. Verás un nuevo menú "🔔 Notificaciones" en la barra de menú
// 3. Haz clic en "🔔 Notificaciones" > "📧 Probar Email (Autorizar Permisos)"
// 4. Google te pedirá autorización (aparecerá una ventana)
// 5. Haz clic en "Revisar permisos" > Selecciona tu cuenta > "Permitir"
//
// OPCIÓN 2:
// 1. Ve a Extensiones > Apps Script
// 2. Selecciona "testEmailNotification" en el menú desplegable
// 3. Haz clic en "Ejecutar" (▶️)
// 4. Autoriza cuando Google lo solicite
// ═══════════════════════════════════════════════════════════════
function testEmailNotification() {
  console.log('=== INICIANDO PRUEBA DE EMAIL ===');
  
  // Intentar obtener UI solo si estamos en el contexto de Google Sheets
  let ui = null;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (uiError) {
    console.log('No se puede usar UI (ejecutando desde editor de Apps Script)');
  }
  
  try {
    // Intentar enviar un email simple primero para forzar la autorización
    console.log('Intentando enviar email de prueba...');
    
    MailApp.sendEmail({
      to: 'lizarraga.dev@gmail.com',
      subject: '🎄 Prueba de Notificación - Chocobombas K-boom',
      htmlBody: '<h2>✅ ¡Funciona!</h2><p>El sistema de notificaciones está configurado correctamente.</p><p>Fecha: ' + new Date().toLocaleString('es-BO') + '</p>'
    });
    
    console.log('✅ Email de prueba enviado exitosamente');
    
    // Ahora probar con la función completa
    const testData = {
      fullName: 'Cliente de Prueba',
      phone: '60139013',
      regularPackages: '• Paquete Familiar (4 unidades)',
      regularQuantity: 4,
      designs: 'Surtido (diseños variados)',
      jengibrePackages: 'Ninguno',
      jengibreQuantity: 0,
      depositAmount: 50,
      remainingAmount: 35,
      totalPrice: 85,
      observations: 'Este es un pedido de prueba para verificar el sistema de notificaciones'
    };
    
    sendNotificationEmail(testData, 999);
    console.log('✅ Función sendNotificationEmail ejecutada');
    
    if (ui) {
      ui.alert('✅ Éxito', 'Email de prueba enviado correctamente. Revisa tu bandeja de entrada en lizarraga.dev@gmail.com', ui.ButtonSet.OK);
    }
    return '✅ Prueba completada exitosamente. Revisa tu bandeja de entrada en lizarraga.dev@gmail.com';
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    console.error('Tipo de error:', typeof error);
    console.error('Mensaje:', error.toString());
    
    if (error.toString().includes('permission') || error.toString().includes('authorization')) {
      console.error('');
      console.error('═══════════════════════════════════════════════════════');
      console.error('⚠️ PROBLEMA DE PERMISOS - SOLUCIÓN:');
      console.error('═══════════════════════════════════════════════════════');
      console.error('1. Ve a: https://script.google.com/home/usersettings');
      console.error('2. Busca tu proyecto de Apps Script');
      console.error('3. Haz clic en "Permitir" o "Authorize"');
      console.error('4. Selecciona tu cuenta de Google');
      console.error('5. Haz clic en "Permitir" en la ventana de permisos');
      console.error('6. Vuelve a ejecutar esta función (testEmailNotification)');
      console.error('═══════════════════════════════════════════════════════');
      
      if (ui) {
        const response = ui.alert(
          '⚠️ Se Requieren Permisos',
          'Para enviar emails, necesitas autorizar los permisos.\n\n' +
          '¿Quieres abrir la página de configuración de permisos?',
          ui.ButtonSet.YES_NO
        );
        
        if (response === ui.Button.YES) {
          const html = HtmlService.createHtmlOutput(
            '<script>window.open("https://script.google.com/home/usersettings", "_blank");</script>' +
            '<p>Redirigiendo a la página de permisos...</p>' +
            '<p>Si no se abre automáticamente, ve a: <a href="https://script.google.com/home/usersettings" target="_blank">https://script.google.com/home/usersettings</a></p>'
          ).setWidth(400).setHeight(200);
          ui.showModalDialog(html, 'Configuración de Permisos');
        }
      }
      
      return 'Error de permisos. Ve a https://script.google.com/home/usersettings y autoriza manualmente.';
    }
    
    if (ui) {
      ui.alert('❌ Error', 'Error al enviar email: ' + error.toString(), ui.ButtonSet.OK);
    }
    return 'Error: ' + error.toString() + '\nRevisa los logs para más detalles.';
  }
}

