# Nuevo Reparto

Programa de reparto para Panaderia Josue, rehecho sin usuarios y con paginas separadas.

## Paginas

- `index.html`: inicio con botones principales.
- `reparto.html`: tabla diaria de clientes, pagos, gastos y nuevo dia.
- `configuracion.html`: productos, precios y clientes base.
- `reportes.html`: estadisticas protegidas con contrasena `43315685`.

## Que incluye

- Sin usuarios, login ni Firebase.
- Guardado local en el navegador.
- Vista de PC con tabla de reparto.
- Vista de celular con tarjetas faciles de tocar.
- Productos y clientes se agregan desde Configuracion.
- Precio especial de pan y factura por cliente.
- Clientes por dia con kg de pan, debe, efectivo, MP, cuenta, otros, facturas, observacion y en contra.
- Click en el nombre del cliente para cargar rapidamente lo que pago en efectivo.
- Cierre superior con Total vendido, Efectivo teorico, Efectivo real, Gastos, Diferencia y Deuda.
- Boton **Nuevo dia +**.
- Exportacion e importacion de respaldo en JSON.

## Configuracion

En Productos se cargan precios generales, por ejemplo Pan y Factura.

En Clientes se cargan:

- Nombre.
- Direccion.
- Kg habituales.
- Precio especial pan, si ese cliente tiene otro precio.
- Precio especial factura, si ese cliente tiene otro precio.
- Limite de deuda.
- Lugar en la lista.

Si el precio especial queda vacio o en 0, Reparto usa el precio general del producto.

## Formulas principales

Por cliente:

- `Venta del dia = kg * precio kg pan + facturas * precio factura + otros`
- `Debe = venta del dia + en contra`
- `Cuenta = debe - efectivo - MP`

Reporte del dia:

- `Total vendido = suma de ventas del dia sin contar en contra`
- `Efectivo teorico = suma de efectivo cargado en los clientes`
- `Gastos = suma de gastos cargados en el cierre`
- `Diferencia = efectivo real + gastos - efectivo teorico`
- `Deuda = suma de cuentas pendientes`

Ejemplo: si el efectivo teorico es $120.000 y al contar hay $110.000, la diferencia da -$10.000. Si despues cargas un gasto de $10.000, la diferencia vuelve a $0.

## Nuevo dia +

Si el dia actual es 10/07 y apretas **Nuevo dia +**, se crea el 11/07.

Al crear el nuevo dia:

- Se copian los mismos clientes del dia anterior.
- Se copian solamente los kg de pan.
- Facturas, otros, efectivo, MP y observaciones vuelven a 0.
- La columna `en contra` se carga con la `cuenta` del dia anterior.

Ejemplo: si el 10/07 un cliente debia $30.000, pago $10.000 y quedo una cuenta de $20.000, el 11/07 aparece `en contra = $20.000`.

## Importante sobre los datos

Los repartos se guardan en el navegador del dispositivo usando `localStorage`.

Eso significa:

- No hay usuarios ni login.
- No se mezclan datos entre celulares o computadoras distintas.
- Si se borra el historial/datos del navegador, se pueden perder los repartos.
- Conviene usar **Exportar** al final del dia o antes de limpiar el navegador.
