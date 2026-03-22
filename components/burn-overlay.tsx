'use client';

import { motion, AnimatePresence } from 'framer-motion';

export function BurnOverlay({ open, onDone }: { open: boolean; onDone: () => void }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[80]">
          <motion.div
            className="fire-overlay absolute inset-0"
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 2.2, ease: 'easeInOut' }}
            onAnimationComplete={onDone}
          />
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div className="card-edge rounded-3xl bg-black/60 p-8 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.35em] text-orange-200/70">Burn Protocol</div>
              <h2 className="mt-3 text-3xl font-semibold text-white">File removed</h2>
              <p className="mt-3 max-w-sm text-sm text-white/70">Ambang kegagalan key tercapai. Data target dihapus dari vault.</p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
