'use client';;
import * as React from 'react';
import {
  Popover as PopoverPrimitive,
  PopoverButton as PopoverButtonPrimitive,
  PopoverPanel as PopoverPanelPrimitive,
  PopoverBackdrop as PopoverBackdropPrimitive,
  PopoverGroup as PopoverGroupPrimitive,
} from '@headlessui/react';
import { AnimatePresence, motion } from 'motion/react';

import { getStrictContext } from '@/lib/get-strict-context';

const [PopoverProvider, usePopover] =
  getStrictContext('PopoverContext');

function Popover(
  {
    children,
    ...props
  }
) {
  return (
    <PopoverPrimitive data-slot="popover" {...props}>
      {(bag) => (
        <PopoverProvider value={{ isOpen: bag.open }}>
          {typeof children === 'function' ? children(bag) : children}
        </PopoverProvider>
      )}
    </PopoverPrimitive>
  );
}

function PopoverButton(props) {
  return <PopoverButtonPrimitive data-slot="popover-button" {...props} />;
}

function PopoverBackdrop(props) {
  return <PopoverBackdropPrimitive data-slot="popover-backdrop" {...props} />;
}

function PopoverGroup(props) {
  return <PopoverGroupPrimitive data-slot="popover-group" {...props} />;
}

function PopoverPanel(props) {
  const {
    transition = { type: 'spring', stiffness: 300, damping: 25 },
    as = motion.div,
    ...rest
  } = props;

  const { isOpen } = usePopover();

  return (
    <AnimatePresence>
      {isOpen && (
        <PopoverPanelPrimitive
          key="popover-panel"
          data-slot="popover-panel"
          static
          as={as}
          initial={{ opacity: 0, scale: 0.5, transition }}
          animate={{ opacity: 1, scale: 1, transition }}
          exit={{ opacity: 0, scale: 0.5, transition }}
          {...rest} />
      )}
    </AnimatePresence>
  );
}

export { Popover, PopoverButton, PopoverPanel, PopoverBackdrop, PopoverGroup };
