# Nuevo Reparto

Programa simple para organizar repartos sin separar por usuarios.

## Que incluye

- Vista para navegador de PC con planilla de repartos.
- Vista para celular con tarjetas y botones grandes.
- Carga, edicion y borrado de repartos.
- Estados: Pendiente, En camino, Entregado y No entregado.
- Busqueda por cliente, direccion, zona, detalle o repartidor.
- Resumen de cantidades e importe total.
- Exportacion e importacion de datos en JSON.

## Importante sobre los datos

Los repartos se guardan en el navegador del dispositivo usando `localStorage`.

Eso significa:

- No hay usuarios ni login.
- No se mezclan datos entre celulares o computadoras distintas.
- Si se borra el historial/datos del navegador, se pueden perder los repartos.
- Conviene usar el boton **Exportar** al final del dia o antes de limpiar el navegador.

## Archivos principales

- `index.html`: estructura de la app.
- `styles.css`: estilos para PC y celular.
- `app.js`: guardado, filtros, estados, importacion y exportacion.

## Proximo paso recomendado

Activar GitHub Pages desde **Settings > Pages** para abrir el programa desde un link publico del repositorio.
