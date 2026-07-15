import { useState } from 'react'
import { TbEye, TbEyeOff } from 'react-icons/tb'

function PasswordInput({ className = '', ...props }) {
  const [isVisible, setIsVisible] = useState(false)
  const Icon = isVisible ? TbEyeOff : TbEye

  return (
    <div className="relative">
      <input
        className={`sange-input pr-12 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden ${className}`}
        type={isVisible ? 'text' : 'password'}
        autoComplete="new-password"
        {...props}
      />
      <button
        className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-foreground/45 transition hover:bg-background hover:text-primary"
        type="button"
        aria-label={isVisible ? 'Ocultar contraseña' : 'Ver contraseña'}
        onClick={() => setIsVisible((currentValue) => !currentValue)}
      >
        <Icon className="size-5" />
      </button>
    </div>
  )
}

export default PasswordInput
