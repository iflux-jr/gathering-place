// src/components/shared/SplashScreen.jsx
export default function SplashScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50"
         style={{ background: 'linear-gradient(160deg, #5A3825 0%, #3A2216 40%, #2A180F 100%)' }}>
      {/* Decorative blobs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10"
           style={{ background: 'radial-gradient(circle, #E57A06, transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-10"
           style={{ background: 'radial-gradient(circle, #C46905, transparent)' }} />

      {/* Logo */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-[0_8px_32px_rgba(229,122,6,0.5)]"
             style={{ background: 'linear-gradient(135deg, #E57A06, #C46905)' }}>
          <span className="font-display text-5xl text-white font-bold" style={{ fontFamily: 'Fraunces, serif' }}>G</span>
        </div>
        <div className="absolute inset-0 rounded-3xl animate-ping opacity-20"
             style={{ background: 'linear-gradient(135deg, #E57A06, #C46905)' }} />
      </div>

      <h1 className="font-display text-3xl text-cream-100 font-semibold mb-1"
          style={{ fontFamily: 'Fraunces, serif' }}>
        The Gathering Place
      </h1>
      <p className="font-body text-brown-300 text-sm mb-10" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        Attendance System
      </p>

      {/* Loading bar */}
      <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-full animate-shimmer"
             style={{
               background: 'linear-gradient(90deg, transparent, #E57A06, transparent)',
               backgroundSize: '200% 100%',
               width: '100%',
             }} />
      </div>
    </div>
  );
}
