#!/usr/bin/env node

/**
 * Script avanzado de compresión de imágenes
 * Usa técnicas avanzadas: WebP, optimización inteligente, análisis de contenido
 */

const fs = require('fs');
const path = require('path');

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

// Función para obtener tamaño de archivo
function getFileSize(filePath) {
    const stats = fs.statSync(filePath);
    return {
        bytes: stats.size,
        mb: (stats.size / (1024 * 1024)).toFixed(2)
    };
}

// Función para obtener metadatos de imagen
async function getImageMetadata(imagePath) {
    try {
        const metadata = await sharp(imagePath).metadata();
        return metadata;
    } catch (error) {
        return null;
    }
}

// Función para determinar si la imagen tiene transparencia
async function hasTransparency(imagePath) {
    try {
        const stats = await sharp(imagePath).stats();
        return stats.channels.length === 4; // RGBA
    } catch {
        return false;
    }
}

// Comprimir PNG con técnicas avanzadas
async function compressPNGAdvanced(inputPath, outputPath, metadata) {
    const originalSize = getFileSize(inputPath);
    const hasAlpha = await hasTransparency(inputPath);
    
    try {
        let pipeline = sharp(inputPath);
        
        // Redimensionar solo si es muy grande (más de 2000px)
        const maxDimension = Math.max(metadata.width, metadata.height);
        if (maxDimension > 2000) {
            pipeline = pipeline.resize(2000, null, {
                withoutEnlargement: true,
                fit: 'inside',
                kernel: sharp.kernel.lanczos3 // Mejor calidad al redimensionar
            });
        }
        
        // Optimización avanzada de PNG
        await pipeline
            .png({
                quality: 90, // Alta calidad
                compressionLevel: 9, // Máxima compresión
                adaptiveFiltering: true, // Filtrado adaptativo
                palette: !hasAlpha && metadata.channels <= 3, // Usar paleta si no hay transparencia
                effort: 10 // Máximo esfuerzo de compresión
            })
            .toFile(outputPath);
        
        const newSize = getFileSize(outputPath);
        const reduction = ((1 - newSize.bytes / originalSize.bytes) * 100).toFixed(1);
        
        return {
            success: true,
            originalSize: originalSize.mb,
            newSize: newSize.mb,
            reduction
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Comprimir JPEG con técnicas avanzadas
async function compressJPEGAdvanced(inputPath, outputPath, metadata) {
    const originalSize = getFileSize(inputPath);
    
    try {
        let pipeline = sharp(inputPath);
        
        // Redimensionar solo si es muy grande
        const maxDimension = Math.max(metadata.width, metadata.height);
        if (maxDimension > 2000) {
            pipeline = pipeline.resize(2000, null, {
                withoutEnlargement: true,
                fit: 'inside',
                kernel: sharp.kernel.lanczos3
            });
        }
        
        // Optimización avanzada de JPEG
        await pipeline
            .jpeg({
                quality: 85, // Alta calidad
                mozjpeg: true, // Usar mozjpeg (mejor compresión)
                progressive: true, // JPEG progresivo (carga progresiva)
                optimizeScans: true, // Optimizar escaneos
                trellisQuantisation: true, // Cuantización trellis
                overshootDeringing: true, // Reducir ringing
                optimizeCoding: true // Optimizar codificación
            })
            .toFile(outputPath);
        
        const newSize = getFileSize(outputPath);
        const reduction = ((1 - newSize.bytes / originalSize.bytes) * 100).toFixed(1);
        
        return {
            success: true,
            originalSize: originalSize.mb,
            newSize: newSize.mb,
            reduction
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Intentar convertir a WebP (mejor compresión)
async function tryWebP(inputPath, outputPath, metadata, hasAlpha) {
    const originalSize = getFileSize(inputPath);
    
    try {
        let pipeline = sharp(inputPath);
        
        const maxDimension = Math.max(metadata.width, metadata.height);
        if (maxDimension > 2000) {
            pipeline = pipeline.resize(2000, null, {
                withoutEnlargement: true,
                fit: 'inside',
                kernel: sharp.kernel.lanczos3
            });
        }
        
        await pipeline
            .webp({
                quality: 90,
                effort: 6, // Balance entre velocidad y compresión
                method: 6, // Método de compresión
                lossless: false,
                nearLossless: false
            })
            .toFile(outputPath);
        
        const newSize = getFileSize(outputPath);
        
        // Solo usar WebP si es significativamente más pequeño
        if (newSize.bytes < originalSize.bytes * 0.9) {
            return {
                success: true,
                originalSize: originalSize.mb,
                newSize: newSize.mb,
                reduction: ((1 - newSize.bytes / originalSize.bytes) * 100).toFixed(1),
                format: 'webp'
            };
        }
        
        return null; // No vale la pena convertir
    } catch (error) {
        return null;
    }
}

// Función principal mejorada
async function compressImagesAdvanced() {
    console.log('🖼️  Iniciando compresión avanzada de imágenes...\n');
    console.log('📊 Analizando imágenes y aplicando técnicas optimizadas...\n');
    
    // Encontrar todas las imágenes
    const imageDirs = ['images/chocos', 'images/packs', 'images'];
    const imagesToCompress = [];
    
    for (const dir of imageDirs) {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir)
                .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
                .map(f => path.join(dir, f))
                .filter(f => fs.existsSync(f));
            imagesToCompress.push(...files);
        }
    }
    
    // Agregar archivos específicos
    ['images/qr-pago.jpeg', 'images/logo_transparencia.png'].forEach(file => {
        if (fs.existsSync(file)) {
            imagesToCompress.push(file);
        }
    });
    
    let totalOriginalSize = 0;
    let totalNewSize = 0;
    let processed = 0;
    let skipped = 0;
    
    for (const imagePath of imagesToCompress) {
        const ext = path.extname(imagePath).toLowerCase();
        const filename = path.basename(imagePath);
        
        // Obtener metadatos
        const metadata = await getImageMetadata(imagePath);
        if (!metadata) {
            console.log(`⚠️  No se pudieron leer metadatos: ${imagePath}\n`);
            skipped++;
            continue;
        }
        
        const originalSize = getFileSize(imagePath);
        totalOriginalSize += parseFloat(originalSize.mb);
        
        // Hacer respaldo
        const backupPath = path.join(backupDir, filename);
        fs.copyFileSync(imagePath, backupPath);
        
        console.log(`📦 Procesando: ${filename}`);
        console.log(`   Dimensiones: ${metadata.width}x${metadata.height}, Tamaño: ${originalSize.mb}MB`);
        
        const tempPath = `${imagePath}.tmp`;
        let result;
        let useWebP = false;
        
        // Intentar WebP primero para imágenes grandes
        if (originalSize.bytes > 500 * 1024) { // Solo para imágenes > 500KB
            const hasAlpha = await hasTransparency(imagePath);
            const webpPath = imagePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
            const webpResult = await tryWebP(imagePath, webpPath, metadata, hasAlpha);
            
            if (webpResult && webpResult.success) {
                console.log(`   ✨ WebP: ${webpResult.originalSize}MB → ${webpResult.newSize}MB (${webpResult.reduction}%)`);
                // Comparar con formato original
                if (ext === '.png') {
                    result = await compressPNGAdvanced(imagePath, tempPath, metadata);
                } else {
                    result = await compressJPEGAdvanced(imagePath, tempPath, metadata);
                }
                
                if (result.success) {
                    const webpSize = getFileSize(webpPath);
                    const originalSize = getFileSize(tempPath);
                    
                    if (webpSize.bytes < originalSize.bytes) {
                        // WebP es mejor, mantenerlo y eliminar el temporal
                        fs.unlinkSync(tempPath);
                        fs.unlinkSync(imagePath);
                        fs.renameSync(webpPath, imagePath.replace(/\.(png|jpg|jpeg)$/i, '.webp'));
                        result.newSize = webpResult.newSize;
                        result.reduction = webpResult.reduction;
                        useWebP = true;
                        console.log(`   ✅ Convertido a WebP (mejor compresión)`);
                    } else {
                        // Formato original es mejor
                        fs.unlinkSync(webpPath);
                        fs.renameSync(tempPath, imagePath);
                        console.log(`   ✅ Optimizado (formato original mejor que WebP)`);
                    }
                }
            } else {
                // Continuar con formato original
                if (ext === '.png') {
                    result = await compressPNGAdvanced(imagePath, tempPath, metadata);
                } else if (ext === '.jpeg' || ext === '.jpg') {
                    result = await compressJPEGAdvanced(imagePath, tempPath, metadata);
                }
                
                if (result && result.success) {
                    fs.renameSync(tempPath, imagePath);
                }
            }
        } else {
            // Para imágenes pequeñas, solo optimizar formato original
            if (ext === '.png') {
                result = await compressPNGAdvanced(imagePath, tempPath, metadata);
            } else if (ext === '.jpeg' || ext === '.jpg') {
                result = await compressJPEGAdvanced(imagePath, tempPath, metadata);
            }
            
            if (result && result.success) {
                fs.renameSync(tempPath, imagePath);
            }
        }
        
        if (result && result.success) {
            totalNewSize += parseFloat(result.newSize);
            processed++;
            console.log(`   ✅ ${result.originalSize}MB → ${result.newSize}MB (reducción: ${result.reduction}%)\n`);
        } else {
            skipped++;
            console.log(`   ⚠️  No se pudo optimizar\n`);
        }
    }
    
    console.log('═══════════════════════════════════════');
    console.log('✅ Compresión avanzada completada!');
    console.log(`📊 Total procesado: ${processed} imágenes`);
    console.log(`⏭️  Omitidas: ${skipped} imágenes`);
    console.log(`📦 Tamaño original: ${totalOriginalSize.toFixed(2)}MB`);
    console.log(`📦 Tamaño final: ${totalNewSize.toFixed(2)}MB`);
    console.log(`💾 Reducción total: ${((1 - totalNewSize / totalOriginalSize) * 100).toFixed(1)}%`);
    console.log(`💾 Espacio ahorrado: ${(totalOriginalSize - totalNewSize).toFixed(2)}MB`);
    console.log(`📁 Respaldo guardado en: ${backupDir}`);
    console.log('═══════════════════════════════════════');
}

// Ejecutar
compressImagesAdvanced().catch(console.error);

