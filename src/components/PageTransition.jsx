import React from 'react';
import { motion } from 'framer-motion';

export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.05 }} // Decisive, high-speed split cut
      className="w-full min-h-screen bg-bgMain"
    >
      {children}
    </motion.div>
  );
}
