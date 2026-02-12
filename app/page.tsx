import { LoginForm } from '@/components/forms/LoginForm';
import Image from 'next/image';

export default function Page() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Nissan Logo */}
          <div className="flex justify-center mb-12">
            <Image
              src="/images/nissan-logo.jpg"
              alt="Nissan Logo"
              width={200}
              height={100}
              className="w-48 h-auto"
              style={{ height: 'auto' }}
              priority
            />
          </div>

          {/* Login Form */}
          <LoginForm />
        </div>
      </div>

      {/* Right side - Car Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700">
          {/* Placeholder for car image */}
          <div className="w-full h-full flex items-center justify-center text-white text-xl">
            <div className="text-center">
              <p className="mb-4">Nissan GT-R</p>
              <p className="text-sm text-gray-400"></p>
            </div>
          </div>
          {
          <Image
            src="/images/nissan-gtr.jpg"
            alt="Nissan GT-R"
            fill
            sizes="(max-width: 1024px) 0vw, 50vw"
            quality={75}
            className="object-cover"
            priority
          />
          }
        </div>
      </div>
    </div>
  );
}