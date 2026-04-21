/* ============================================================
   Modal.tsx
   Portal-based modal wrapper. Renders content directly into
   document.body so no parent stacking context (Framer Motion
   transforms, z-index on pagelayout-content, etc.) can cause
   the navbar or bottom dock to paint over the backdrop.

   Usage — drop-in replacement for <div className="modal-backdrop">:

     import Modal from "../ui/Modal";

     {isOpen && (
       <Modal onClose={() => setIsOpen(false)}>
         <div className="modal your-modal-class">
           ...
         </div>
       </Modal>
     )}
   ============================================================ */

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  children:   ReactNode;
  onClose?:   () => void;   // called when backdrop is clicked
  closeOnBackdropClick?: boolean;  // default: true
}

const Modal = ({ children, onClose, closeOnBackdropClick = true }: ModalProps) => {

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      {children}
    </div>,
    document.body
  );
};

export default Modal;