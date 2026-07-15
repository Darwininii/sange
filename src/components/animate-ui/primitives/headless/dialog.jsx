'use client';;
import {
  Dialog as DialogPrimitive,
  DialogBackdrop as DialogBackdropPrimitive,
  DialogPanel as DialogPanelPrimitive,
  DialogTitle as DialogTitlePrimitive,
  Description as DialogDescriptionPrimitive,
  CloseButton,
} from '@headlessui/react';
import { motion } from 'motion/react';

function Dialog(
  {
    className,
    ...props
  }
) {
  return (
    props?.open && (
      <DialogPrimitive data-slot="dialog" className={className} {...props} static />
    )
  );
}

function DialogBackdrop(props) {
  const {
    as = motion.div,
    transition = { duration: 0.2, ease: 'easeInOut' },
    ...rest
  } = props;

  return (
    <DialogBackdropPrimitive
      key="dialog-backdrop"
      data-slot="dialog-backdrop"
      as={as}
      initial={{ opacity: 0, filter: 'blur(4px)', transition }}
      animate={{ opacity: 1, filter: 'blur(0px)', transition }}
      exit={{ opacity: 0, filter: 'blur(4px)', transition }}
      {...rest} />
  );
}

function DialogPanel(props) {
  const {
    children,
    as = motion.div,
    from = 'top',
    transition = { type: 'spring', stiffness: 150, damping: 25 },
    ...rest
  } = props;

  const initialRotation =
    from === 'bottom' || from === 'left' ? '20deg' : '-20deg';
  const isVertical = from === 'top' || from === 'bottom';
  const rotateAxis = isVertical ? 'rotateX' : 'rotateY';

  return (
    <DialogPanelPrimitive
      key="dialog-panel"
      data-slot="dialog-panel"
      as={as}
      initial={{
        opacity: 0,
        filter: 'blur(4px)',
        transform: `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`,
        transition,
      }}
      animate={{
        opacity: 1,
        filter: 'blur(0px)',
        transform: `perspective(500px) ${rotateAxis}(0deg) scale(1)`,
        transition,
      }}
      exit={{
        opacity: 0,
        filter: 'blur(4px)',
        transform: `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`,
        transition,
      }}
      {...rest}>
      {(bag) => (
        <>{typeof children === 'function' ? children(bag) : children}</>
      )}
    </DialogPanelPrimitive>
  );
}

function DialogClose(props) {
  const { as = 'button', ...rest } = props;

  return (<CloseButton data-slot="dialog-close" as={as} {...rest} />);
}

function DialogHeader(
  {
    as: Component = 'div',
    ...props
  }
) {
  return <Component data-slot="dialog-header" {...props} />;
}

function DialogFooter({
  as: Component = 'div',
  ...props
}) {
  return <Component data-slot="dialog-footer" {...props} />;
}

function DialogTitle(props) {
  return <DialogTitlePrimitive data-slot="dialog-title" {...props} />;
}

function DialogDescription(props) {
  return (<DialogDescriptionPrimitive data-slot="dialog-description" {...props} />);
}

export { Dialog, DialogBackdrop, DialogPanel, DialogClose, DialogTitle, DialogDescription, DialogHeader, DialogFooter };
