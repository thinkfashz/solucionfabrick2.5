# Product Studio · Imagen IA

La acción `Imagen IA` aparece únicamente en `/admin/productos`.

- `Generar nueva`: crea una portada cuadrada desde la ficha del producto.
- `Mejorar actual`: usa la portada existente como referencia cuando el modelo lo soporta.
- La generación es manual; nunca se ejecuta al abrir ni al guardar un producto.
- El backend usa la integración OpenRouter ya configurada y descubre modelos de imagen compatibles en runtime.
- El resultado se sube de forma firmada a Cloudinary y se guarda como `products.image_url` y dentro de la galería del producto.
- Las credenciales de IA y Cloudinary nunca se envían al navegador.
- La acción requiere permisos de administrador de contenido.
