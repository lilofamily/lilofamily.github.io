#!/usr/bin/env node

/**
 * Script para comprimir imágenes del proyecto Chocobombas K-boom
 * Usa sharp para comprimir PNG y JPEG de manera eficiente
 */

const fs = require('fs');
const path = require('path');

// Verificar si sharp está instalado
let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.log('❌ Sharp no está instalado. Instalando...');
    console.log('Por favor ejecuta: npm install sharp');
    process.exit(1);
}

// Crear directorio de respaldo
const backupDir = `images_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`;
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📁 Directorio de respaldo creado: ${backupDir}\n`);
}

// Función para obtener tamaño de archivo en MB
function getFileSizeMB(filePath) {
    const stats = fs.statSync(filePath);
    return (stats.size / (1024 * 1024)).toFixed(2);
}

// Función para comprimir PNG
async function compressPNG(inputPath, outputPath) {
    const originalSize = getFileSizeMB(inputPath);
    
    try {
        // Comprimir PNG manteniendo transparencia si existe
        await sharp(inputPath)
            .png({ 
                quality: 85,
                compressionLevel: 9,
                adaptiveFiltering: true
            })
            .resize(1200, null, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .toFile(outputPath);
        
        const newSize = getFileSizeMB(outputPath);
        const reduction = ((1 - parseFloat(newSize) / parseFloat(originalSize)) * 100).toFixed(1);
        
        return {
            success: true,
            originalSize,
            newSize,
            reduction
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Función para comprimir JPEG
async function compressJPEG(inputPath, outputPath) {
    const originalSize = getFileSizeMB(inputPath);
    
    try {
        await sharp(inputPath)
            .jpeg({ 
                quality: 80,
                mozjpeg: true
            })
            .resize(1200, null, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .toFile(outputPath);
        
        const newSize = getFileSizeMB(outputPath);
        const reduction = ((1 - parseFloat(newSize) / parseFloat(originalSize)) * 100).toFixed(1);
        
        return {
            success: true,
            originalSize,
            newSize,
            reduction
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Función principal
async function compressImages() {
    console.log('🖼️  Iniciando compresión de imágenes...\n');
    
    const imagesToCompress = [
        ...fs.readdirSync('images/chocos').map(f => `images/chocos/${f}`),
        ...fs.readdirSync('images/packs').map(f => `images/packs/${f}`),
        'images/qr-pago.jpeg'
    ].filter(f => fs.existsSync(f));
    
    let totalOriginalSize = 0;
    let totalNewSize = 0;
    let processed = 0;
    
    for (const imagePath of imagesToCompress) {
        if (!fs.existsSync(imagePath)) continue;
        
        const ext = path.extname(imagePath).toLowerCase();
        const filename = path.basename(imagePath);
        const dir = path.dirname(imagePath);
        
        // Hacer respaldo
        const backupPath = path.join(backupDir, filename);
        fs.copyFileSync(imagePath, backupPath);
        
        console.log(`📦 Comprimiendo: ${imagePath}`);
        
        const tempPath = `${imagePath}.tmp`;
        let result;
        
        if (ext === '.png') {
            result = await compressPNG(imagePath, tempPath);
        } else if (ext === '.jpeg' || ext === '.jpg') {
            result = await compressJPEG(imagePath, tempPath);
        } else {
            console.log(`  ⚠️  Formato no soportado: ${ext}\n`);
            continue;
        }
        
        if (result.success) {
            // Reemplazar original con comprimido
            fs.renameSync(tempPath, imagePath);
            totalOriginalSize += parseFloat(result.originalSize);
            totalNewSize += parseFloat(result.newSize);
            processed++;
            
            console.log(`  ✅ ${result.originalSize}MB → ${result.newSize}MB (reducción: ${result.reduction}%)\n`);
        } else {
            console.log(`  ❌ Error: ${result.error}\n`);
            // Eliminar archivo temporal si existe
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        }
    }
    
    console.log('═══════════════════════════════════════');
    console.log('✅ Compresión completada!');
    console.log(`📊 Total procesado: ${processed} imágenes`);
    console.log(`📦 Tamaño original: ${totalOriginalSize.toFixed(2)}MB`);
    console.log(`📦 Tamaño final: ${totalNewSize.toFixed(2)}MB`);
    console.log(`💾 Reducción total: ${((1 - totalNewSize / totalOriginalSize) * 100).toFixed(1)}%`);
    console.log(`📁 Respaldo guardado en: ${backupDir}`);
    console.log('═══════════════════════════════════════');
}

// Ejecutar
compressImages().catch(console.error);

