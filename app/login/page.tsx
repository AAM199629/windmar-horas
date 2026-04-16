import LoginForm from './LoginForm'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <div
      style={{ background: '#0D1654' }}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image src="/windmar-logo.png" alt="Windmar" width={160} height={48} className="object-contain" priority />
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0D1654' }}
            className="text-3xl font-bold text-center mb-1 tracking-wide"
          >
            WINDMAR HORAS
          </h1>
          <p className="text-slate-400 text-sm text-center mb-6">Ingresa con tu cuenta</p>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
