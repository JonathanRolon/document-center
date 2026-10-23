// hourCycle h23: el formato por defecto de es-AR usa 12 h sin a.m./p.m. (18:00 se ve como 06:00)
const fechaHora = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' });
const soloFecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' });

export const formatearFechaHora = (iso) => fechaHora.format(new Date(iso));
export const formatearFecha = (iso) => soloFecha.format(new Date(iso));
