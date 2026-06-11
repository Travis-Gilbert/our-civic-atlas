// @ts-nocheck
import { useState } from 'react';
import { C, mono } from '../tokens';

const base = {
  ...mono,
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  padding: '16px 32px',
  borderRadius: 8,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  transition: 'background .2s, transform .2s, border-color .2s, color .2s',
  cursor: 'pointer',
  border: 'none',
};

const variants = {
  primary: {
    background: C.teal,
    color: '#fff',
  },
  secondary: {
    background: 'transparent',
    border: `1.5px solid rgba(240,235,228,.2)`,
    color: 'rgba(240,235,228,.55)',
  },
};

const hoverVariants = {
  primary: {
    background: C.tealBright,
    transform: 'translateY(-2px)',
  },
  secondary: {
    borderColor: 'rgba(240,235,228,.5)',
    color: 'rgba(240,235,228,.9)',
  },
};

export default function Button({ variant = 'primary', href, onClick, children, style: extraStyle, ...props }) {
  const [hovered, setHovered] = useState(false);
  const s = {
    ...base,
    ...variants[variant],
    ...(hovered ? hoverVariants[variant] : {}),
    ...extraStyle,
  };

  const handlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };

  if (href) {
    return <a href={href} style={s} {...handlers} {...props}>{children}</a>;
  }
  return <button style={s} onClick={onClick} {...handlers} {...props}>{children}</button>;
}
