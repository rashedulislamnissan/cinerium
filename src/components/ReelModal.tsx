import { REEL_POSTER, REEL_SRC } from '../lib/asset';
import { Modal } from './ui';

export function ReelModal({ open, onClose, title }: { open: boolean; onClose: () => void; title: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <h2 className="font-display pr-10 text-2xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-ink-3">A stand-in reel — demo films don’t have real trailers.</p>
      {open && (
        <video
          className="mt-5 aspect-video w-full rounded-sm bg-bg-0"
          src={REEL_SRC}
          poster={REEL_POSTER}
          controls
          autoPlay
          loop
          playsInline
        />
      )}
    </Modal>
  );
}
