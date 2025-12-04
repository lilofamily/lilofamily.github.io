# Chocobombas K-boom 🎄

Sitio web estático para el emprendimiento de chocobombas navideñas.

## Características

- ✅ Diseño responsivo (web y móvil)
- ✅ Tema claro y oscuro (dark/light mode)
- ✅ Sitio estático listo para Netlify o GitHub Pages
- ✅ Sistema de selección de paquetes
- ✅ 20 diseños diferentes de chocobombas
- ✅ Opción de surtido o diseños específicos
- ✅ Integración con WhatsApp con mensaje pre-escrito
- ✅ Carrito con localStorage
- ✅ Diseño navideño con colores temáticos

## Paquetes Disponibles

1. **Paquete Individual**: 1 Chocobomba - 10 Bs.
2. **Paquete Familiar**: 4 Chocobombas - 35 Bs.
3. **Paquete Grande**: 8 Chocobombas - 70 Bs. + 1 Chocobomba Jengibre de regalo
4. **Paquete Extra Grande**: 12 Chocobombas - 105 Bs. + 2 Chocobombas Jengibre de regalo

## Instalación y Despliegue

### Desarrollo Local

Simplemente abre el archivo `index.html` en tu navegador o usa un servidor local:

```bash
# Con Python
python -m http.server 8000

# Con Node.js (http-server)
npx http-server
```

### Despliegue en Netlify

1. Arrastra la carpeta del proyecto a [Netlify Drop](https://app.netlify.com/drop)
2. O conecta tu repositorio de GitHub

### Despliegue en GitHub Pages

1. Sube los archivos a un repositorio de GitHub
2. Ve a Settings > Pages
3. Selecciona la rama main y la carpeta raíz
4. El sitio estará disponible en `https://tuusuario.github.io/repositorio`

## Estructura de Archivos

```
website/
├── index.html      # Estructura HTML principal
├── styles.css      # Estilos con tema navideño
├── script.js       # Funcionalidad JavaScript
└── README.md       # Este archivo
```

## Personalización

### Cambiar número de WhatsApp

Edita la variable `whatsappNumber` en `script.js`:

```javascript
const whatsappNumber = '59160139013';
```

### Modificar diseños

Edita el array `designs` en `script.js` para cambiar los nombres de los diseños.

### Cambiar colores

Modifica las variables CSS en `styles.css` dentro de `:root` y `[data-theme="dark"]`.

## Tecnologías Utilizadas

- HTML5
- CSS3 (Variables CSS, Grid, Flexbox)
- JavaScript (Vanilla JS)
- Google Fonts (Poppins)

## Notas

- El sitio es completamente estático, no requiere backend
- Los datos del carrito se guardan en localStorage del navegador
- Compatible con todos los navegadores modernos
- Optimizado para carga rápida

