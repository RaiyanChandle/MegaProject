import React from 'react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onCancel,
  onConfirm, 
  title, 
  message, 
  confirmText,
  confirmLabel,
  cancelText = 'Cancel',
  cancelLabel,
  isDestructive = false,
  loading = false,
  disabled = false
}) {
  const handleClose = () => {
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  const handleConfirm = async () => {
    try {
      if (onConfirm) await onConfirm();
    } finally {
      handleClose();
    }
  };

  const finalConfirmText = confirmText || confirmLabel || 'Confirm';
  const finalCancelText = cancelText || cancelLabel || 'Cancel';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="max-w-sm">
      <div className="space-y-6">
        <p className="text-sm text-text-500">{message}</p>
        
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={loading || disabled}>
            {finalCancelText}
          </Button>
          <Button 
            variant={isDestructive ? 'destructive' : 'primary'} 
            onClick={handleConfirm}
            disabled={loading || disabled}
          >
            {loading ? 'Deleting...' : finalConfirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
