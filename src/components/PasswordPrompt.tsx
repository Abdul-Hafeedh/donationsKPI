import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, ArrowRight } from 'lucide-react';

interface PasswordPromptProps {
  onUnlock: (password: string) => Promise<boolean>;
}

export const PasswordPrompt: React.FC<PasswordPromptProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading) return;

    setIsLoading(true);
    setError(false);

    try {
      const success = await onUnlock(password);
      if (!success) {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          maxWidth: '440px',
          borderRadius: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
          border: '1px solid #e2e8f0',
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#e6f4f1',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            color: '#004d40',
          }}
        >
          <Lock size={32} />
        </div>

        <h1
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 8px 0',
          }}
        >
          Beskyttet Dashboard
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: '#64748b',
            lineHeight: 1.5,
            margin: '0 0 28px 0',
          }}
        >
          Reparations.Konsortiets donationsstatistik og transaktionsdata er krypteret med AES-256 for at beskytte personfølsomme oplysninger.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <input
              type="password"
              placeholder="Indtast adgangskode..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '14px 16px 14px 42px',
                borderRadius: '12px',
                border: error ? '2px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '15px',
                outline: 'none',
                backgroundColor: error ? '#fef2f2' : '#f8fafc',
                color: '#0f172a',
                boxSizing: 'border-box',
                transition: 'all 0.15s ease',
              }}
            />
            <KeyRound
              size={18}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: error ? '#ef4444' : '#94a3b8',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '16px',
                textAlign: 'left',
                backgroundColor: '#fef2f2',
                padding: '10px 14px',
                borderRadius: '8px',
              }}
            >
              <ShieldAlert size={16} />
              <span>Forkert adgangskode. Kunne ikke dekryptere data.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: '12px',
              backgroundColor: '#004d40',
              color: '#ffffff',
              border: 'none',
              fontSize: '15px',
              fontWeight: 700,
              cursor: isLoading || !password.trim() ? 'not-allowed' : 'pointer',
              opacity: isLoading || !password.trim() ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.15s ease',
            }}
          >
            {isLoading ? (
              <span>Dekrypterer data...</span>
            ) : (
              <>
                <span>Lås dashboard op</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
