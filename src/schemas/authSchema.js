import { z } from 'zod'

const nicknamePattern = /^[a-z0-9]+-[a-z0-9]+(\d*)$/

export const loginSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, 'La credencial es obligatoria.')
    .transform((value) => value.toLowerCase())
    .refine((value) => nicknamePattern.test(value), {
      message: 'Ingresa una credencial valida, por ejemplo: darwin-nino.',
    }),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
})
