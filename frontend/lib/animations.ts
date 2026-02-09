// Shared animation variants for consistent micro-interactions

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
}

export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
}

// Stagger children animation
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

// Button hover/tap animations
export const buttonHover = {
  scale: 1.02,
  transition: { type: 'spring', stiffness: 400, damping: 10 },
}

export const buttonTap = {
  scale: 0.98,
}

// Success animation
export const successPulse = {
  scale: [1, 1.05, 1],
  transition: { duration: 0.3 },
}

// Shake animation for errors
export const shake = {
  x: [0, -10, 10, -10, 10, 0],
  transition: { duration: 0.5 },
}

// Bounce animation
export const bounce = {
  y: [0, -10, 0],
  transition: { duration: 0.5, repeat: Infinity, repeatDelay: 2 },
}

// Pulse glow animation
export const pulseGlow = {
  boxShadow: [
    '0 0 0 0 rgba(239, 68, 68, 0)',
    '0 0 20px 5px rgba(239, 68, 68, 0.3)',
    '0 0 0 0 rgba(239, 68, 68, 0)',
  ],
  transition: { duration: 2, repeat: Infinity },
}

// Card hover effect
export const cardHover = {
  y: -5,
  boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
  transition: { type: 'spring', stiffness: 300, damping: 20 },
}

// Page transition
export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 },
}

// Number counter animation config
export const counterSpring = {
  type: 'spring',
  stiffness: 100,
  damping: 15,
}

// Floating animation
export const float = {
  y: [0, -10, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: 'easeInOut',
  },
}

// Spin animation
export const spin = {
  rotate: 360,
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'linear',
  },
}

// Wiggle animation
export const wiggle = {
  rotate: [0, -5, 5, -5, 5, 0],
  transition: { duration: 0.5 },
}
