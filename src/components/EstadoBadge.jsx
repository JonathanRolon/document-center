export default function EstadoBadge({ borrador }) {
  return <span className={`badge badge-${borrador ? 'borrador' : 'publicado'}`}>{borrador ? 'Borrador' : 'Publicado'}</span>;
}
