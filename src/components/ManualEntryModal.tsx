import React, { useState } from 'react';
import { X, Plus, Calendar, DollarSign, User, MessageSquare } from 'lucide-react';
import { DonationTransaction } from '../types';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (donation: DonationTransaction) => void;
  isSubmitting?: boolean;
  defaultYear?: number;
  defaultWeek?: number;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  defaultYear,
  defaultWeek,
}) => {
  // Compute default date based on week/year if provided
  const computeInitialDate = () => {
    if (defaultYear && defaultWeek) {
      const jan4 = new Date(Date.UTC(defaultYear, 0, 4));
      const day = jan4.getUTCDay() || 7;
      const monday = new Date(jan4.getTime() - (day - 1) * 86400000 + (defaultWeek - 1) * 7 * 86400000);
      return monday.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  };

  const [date, setDate] = useState<string>(computeInitialDate);
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }).replace('.', ':'));
  const [amount, setAmount] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [source, setSource] = useState<'901600' | '115888'>('901600');
  const [error, setError] = useState<string | null>(null);


  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount < 10) {
      setError('Beløb skal være mindst 10 kr.');
      return;
    }

    const isoDateTime = new Date(`${date}T${time}:00`).toISOString();

    const newDonation: DonationTransaction = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dateTime: isoDateTime,
      name: name.trim() || 'Anonym',
      amount: Math.round(numAmount * 100) / 100,
      message: message.trim(),
      status: 'COMPLETED',
      isLive: false,
      mobilePayNumber: source,
    };

    onSubmit(newDonation);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              ➕ Manuel indtastning af donation
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Tilføj donationer fra MobilePay uden API-adgang (gemmes og synkroniseres)
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          {/* Kilde / MobilePay-nummer */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              MobilePay Kilde
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSource('901600')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: `2px solid ${source === '901600' ? '#004d40' : '#e2e8f0'}`,
                  backgroundColor: source === '901600' ? '#f0fdf4' : '#ffffff',
                  color: source === '901600' ? '#004d40' : '#64748b',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                90 16 00 (Uden API)
              </button>
              <button
                type="button"
                onClick={() => setSource('115888')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: `2px solid ${source === '115888' ? '#004d40' : '#e2e8f0'}`,
                  backgroundColor: source === '115888' ? '#f0fdf4' : '#ffffff',
                  color: source === '115888' ? '#004d40' : '#64748b',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                11 58 88 (Manuel)
              </button>
            </div>
          </div>

          {/* Beløb */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Beløb (kr.) *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="any"
                min="10"
                required
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="f.eks. 100"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '16px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Dato & Tidspunkt */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Dato *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ width: '110px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Tid
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Navn (valgfrit) */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Navn på doner (valgfrit)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Anonym eller Navn"
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Kommentar (valgfrit) */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Kommentar / Besked (valgfrit)
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="f.eks. Tak for hjælpen"
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Knapper */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#004d40',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isSubmitting ? 'Gemmer & Deployer...' : 'Gem og Opdater Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
