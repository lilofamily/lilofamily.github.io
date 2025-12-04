#!/bin/bash

# Script para comprimir imágenes del proyecto Chocobombas K-boom
# Usa sips (macOS) para comprimir las imágenes

echo "🖼️  Iniciando compresión de imágenes..."
echo ""

# Crear directorio de respaldo
BACKUP_DIR="images_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Función para comprimir PNG
compress_png() {
    local file="$1"
    local filename=$(basename "$file")
    local dir=$(dirname "$file")
    
    echo "Comprimiendo: $file"
    
    # Hacer respaldo
    cp "$file" "$BACKUP_DIR/$filename"
    
    # Comprimir con sips (macOS)
    # Reducir calidad y optimizar
    sips -s format jpeg -s formatOptions 80 "$file" --out "${file%.png}.jpg" > /dev/null 2>&1
    
    # Si la conversión a JPEG es más pequeña, reemplazar
    if [ -f "${file%.png}.jpg" ]; then
        local original_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        local jpeg_size=$(stat -f%z "${file%.png}.jpg" 2>/dev/null || stat -c%s "${file%.png}.jpg" 2>/dev/null)
        
        if [ "$jpeg_size" -lt "$original_size" ]; then
            echo "  ✓ Convertido a JPEG: $(echo "scale=1; $jpeg_size/1024/1024" | bc)MB (antes: $(echo "scale=1; $original_size/1024/1024" | bc)MB)"
            rm "$file"
            mv "${file%.png}.jpg" "$file"
        else
            rm "${file%.png}.jpg"
            # Optimizar PNG manteniendo formato
            sips -Z 1200 "$file" > /dev/null 2>&1
            echo "  ✓ Optimizado PNG"
        fi
    fi
}

# Función para comprimir JPEG
compress_jpeg() {
    local file="$1"
    local filename=$(basename "$file")
    
    echo "Comprimiendo: $file"
    
    # Hacer respaldo
    cp "$file" "$BACKUP_DIR/$filename"
    
    # Comprimir JPEG con sips
    sips -s formatOptions 75 "$file" > /dev/null 2>&1
    
    echo "  ✓ JPEG optimizado"
}

# Comprimir imágenes de chocos
echo "📦 Comprimiendo imágenes de chocobombas..."
for img in images/chocos/*.png; do
    if [ -f "$img" ]; then
        compress_png "$img"
    fi
done

echo ""
echo "📦 Comprimiendo imágenes de paquetes..."
for img in images/packs/*.png; do
    if [ -f "$img" ]; then
        compress_png "$img"
    fi
done

echo ""
echo "📦 Comprimiendo QR de pago..."
if [ -f "images/qr-pago.jpeg" ]; then
    compress_jpeg "images/qr-pago.jpeg"
fi

echo ""
echo "✅ Compresión completada!"
echo "📁 Respaldo guardado en: $BACKUP_DIR"
echo ""
echo "📊 Comparación de tamaños:"
du -sh images/chocos/* images/packs/* images/qr-pago.jpeg 2>/dev/null | head -20

