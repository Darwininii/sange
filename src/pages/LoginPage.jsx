import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import LoginForm from '../components/auth/LoginForm'
import appToast from '../hooks/appToast'
import { loginSchema } from '../schemas/authSchema'
import { registerLoginActivity } from '../services/activityService'
import { useAuthStore } from '../store/authStore'
import { authenticateUser } from '../utils/auth'
import ThemeToggle from '../shared/ThemeToggle'
import TitleName from '../shared/TitleName'

const initialFormData = {
  nickname: '',
  password: '',
}

function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [formData, setFormData] = useState(initialFormData)
  const [isLoading, setIsLoading] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((currentData) => ({ ...currentData, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const result = loginSchema.safeParse(formData)

    if (!result.success) {
      appToast.warning(result.error.issues[0].message)
      return
    }

    setIsLoading(true)

    try {
      const user = await appToast.promise(
        (async () => {
          const authenticatedUser = await authenticateUser(
            result.data.nickname,
            result.data.password,
          )

          if (!authenticatedUser) {
            throw new Error('Credencial o contraseña incorrectos.')
          }

          return authenticatedUser
        })(),
        {
          loading: 'Validando acceso...',
          success: 'Sesion iniciada correctamente.',
          error: (authError) =>
            authError instanceof Error
              ? authError.message
              : 'No se pudo conectar con el servicio de autenticacion.',
        },
      )

      login(user)
      registerLoginActivity(user)
      navigate({ to: '/dashboard' })
    } finally {
      setIsLoading(false)
    }
  }

  function handleUseDemoUser(user) {
    setFormData({
      nickname: user.nickname,
      password: user.password,
    })
  }

  return (
    <main className="relative min-h-svh bg-background px-5 py-10">
      <div className="absolute right-5 top-5 z-10">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex min-h-[calc(100svh-5rem)] max-w-6xl items-center justify-center gap-10 lg:justify-between">
        <section className="hidden lg:block">
          <TitleName
            variant="login"
            subtitle="Gestion centralizada para servicio tecnico."
            description="Administra ordenes, clientes, notas, inventario y caja desde una sola plataforma con permisos separados para cada equipo."
          />
        </section>

        <LoginForm
          formData={formData}
          isLoading={isLoading}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onUseDemoUser={handleUseDemoUser}
        />
      </div>
    </main>
  )
}

export default LoginPage
