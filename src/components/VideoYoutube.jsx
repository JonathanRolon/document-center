import { urlEmbed } from '../youtube.js';

// youtube-nocookie: no deja cookies de seguimiento hasta que se reproduce
export default function VideoYoutube({ video, href }) {
  return (
    <div className="video">
      <iframe
        src={urlEmbed(video)}
        title="Video de YouTube"
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        allowFullScreen
      />
      {/* al imprimir el reproductor se oculta y queda el link */}
      <a className="solo-impresion" href={href}>▶ Video: {href}</a>
    </div>
  );
}
