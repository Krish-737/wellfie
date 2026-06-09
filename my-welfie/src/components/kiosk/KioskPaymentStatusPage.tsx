// src/components/kiosk/KioskPaymentStatusPage.tsx
import React from 'react';

interface Props {
  status: 'done' | 'cancelled';
}

const KioskPaymentStatusPage: React.FC<Props> = ({ status }) => {
  const isDone = status === 'done';

  return (
    <div className="min-h-screen bg-[#031427] flex flex-col items-center justify-center px-6 text-center text-white">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border ${
        isDone 
          ? 'bg-emerald-500/20 border-emerald-500/40' 
          : 'bg-yellow-500/20 border-yellow-500/40'
      }`}>
        <span className="text-4xl">{isDone ? '✅' : '⚠️'}</span>
      </div>

      <h1 className="text-3xl font-bold mb-4">
        {isDone ? 'Payment Successful!' : 'Payment Cancelled'}
      </h1>

      <p className="text-gray-400 text-lg mb-8 max-w-sm">
        {isDone 
          ? <>Your payment has been confirmed. Please look at the <span className="text-emerald-400 font-bold">Kiosk Screen</span> to begin your health scan.</>
          : <>The payment process was not completed. If you wish to try again, please refer to the <span className="text-emerald-400 font-bold">Kiosk Screen</span>.</>
        }
      </p>

      <div className="text-sm text-gray-500 italic">
        You can safely close this window on your phone.
      </div>
    </div>
  );
};

export default KioskPaymentStatusPage;
