import * as React from 'react';

import {
  Popover as PopoverPrimitive,
  PopoverButton as PopoverButtonPrimitive,
  PopoverPanel as PopoverPanelPrimitive,
  PopoverBackdrop as PopoverBackdropPrimitive,
  PopoverGroup as PopoverGroupPrimitive,
} from '@/components/animate-ui/primitives/headless/popover';
import { cn } from '@/lib/utils';

function Popover(props) {
  return <PopoverPrimitive {...props} />;
}

function PopoverButton(props) {
  return <PopoverButtonPrimitive {...props} />;
}

function PopoverPanel(
  {
    className,
    anchor = { to: 'bottom', gap: 4 },
    ...props
  }
) {
  return (
    <PopoverPanelPrimitive
      anchor={anchor}
      className={cn(
        'bg-popover text-popover-foreground z-50 w-72 rounded-md border p-4 shadow-md outline-hidden',
        'data-[anchor=top_center]:origin-bottom data-[anchor=top_start]:origin-bottom-left data-[anchor=top_end]:origin-bottom-right',
        'data-[anchor=bottom_center]:origin-top data-[anchor=bottom_start]:origin-top-left data-[anchor=bottom_end]:origin-top-right',
        'data-[anchor=left_center]:origin-right data-[anchor=left_start]:origin-top-right data-[anchor=left_end]:origin-bottom-right',
        'data-[anchor=right_center]:origin-left data-[anchor=right_start]:origin-top-left data-[anchor=right_end]:origin-bottom-left',
        className
      )}
      {...props} />
  );
}

function PopoverBackdrop(props) {
  return <PopoverBackdropPrimitive {...props} />;
}

function PopoverGroup(props) {
  return <PopoverGroupPrimitive {...props} />;
}

export { Popover, PopoverButton, PopoverPanel, PopoverBackdrop, PopoverGroup };
