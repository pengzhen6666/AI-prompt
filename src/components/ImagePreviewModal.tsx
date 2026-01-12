import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}

export function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
}: ImagePreviewModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-black/95 backdrop-blur-md animate-in fade-in duration-300" />
        <Dialog.Content className="fixed inset-0 z-100 flex items-center justify-center p-4 outline-none animate-in zoom-in-95 duration-300">
          {/* Background Click Area */}
          <div className="absolute inset-0 z-0" onClick={onClose} />

          {/* Subtle Close Button */}
          <div className="absolute top-6 right-6 z-20">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
              onClick={onClose}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Main Image */}
          <div
            className="relative z-10 max-w-[80vw] max-h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
