import React, { useState } from 'react';
import { User } from '../types';
import { Eye, EyeOff, KeyRound, Phone, UserRound, ArrowRight, AlertCircle, AlertTriangle, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface LoginRegisterProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginRegister({ onLoginSuccess }: LoginRegisterProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [namaLengkap, setNamaLengkap] = useState('');
  const [noWhatsapp, setNoWhatsapp] = useState('');
  const [rtRw, setRtRw] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [phoneWarning, setPhoneWarning] = useState('');
  const [rtRwWarning, setRtRwWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPetugas, setIsPetugas] = useState(false);

  const isValidRtRw = (value: string) =>
    /^RT\s*\d{1,3}\s*\/\s*RW\s*\d{1,3}$/i.test(value.trim());

  const handleRtRwChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRtRw(value);

    if (value.trim() && !isValidRtRw(value)) {
      setRtRwWarning('Gunakan format RT 03 / RW 04.');
    } else {
      setRtRwWarning('');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const sanitizedValue = rawValue.replace(/\D/g, '');

    if (rawValue !== sanitizedValue) {
      setPhoneWarning('Hanya angka yang diperbolehkan untuk nomor WhatsApp.');
    } else {
      setPhoneWarning('');
    }

    setNoWhatsapp(sanitizedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!noWhatsapp || !password || (!isLogin && !namaLengkap)) {
      setError('Harap lengkapi semua bidang.');
      setLoading(false);
      return;
    }

    if (!isLogin && !isValidRtRw(rtRw)) {
      setError('Domisili harus menggunakan format RT 03 / RW 04.');
      setRtRwWarning('Gunakan format RT 03 / RW 04.');
      setLoading(false);
      return;
    }

    const cleanedPhone = noWhatsapp.replace(/[^0-9]/g, '');
    if (cleanedPhone.length < 9) {
      setError('Nomor WhatsApp minimal 9 digit angka.');
      setLoading(false);
      return;
    } else if (cleanedPhone.length > 15) {
      setError('Nomor WhatsApp maksimal 15 digit angka.');
      setLoading(false);
      return;
    }

    const email = `${cleanedPhone}@ketemuin.com`;

    try {
      if (isLogin) {
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
            throw new Error('Nomor WhatsApp atau kata sandi tidak cocok.');
          } else if (authErr.code === 'auth/invalid-email') {
            throw new Error('Format nomor WhatsApp tidak valid.');
          } else {
            throw authErr;
          }
        }

        const uid = userCredential.user.uid;
        const userDocRef = doc(db, 'users', uid);

        let userDoc;
        try {
          userDoc = await getDoc(userDocRef);
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.GET, `users/${uid}`);
        }

        if (!userDoc || !userDoc.exists()) {
          throw new Error('Data pengguna tidak ditemukan.');
        }

        const userData = userDoc.data();
        onLoginSuccess({
          id_user: userData.id_user,
          nama_lengkap: userData.nama_lengkap,
          no_whatsapp: userData.no_whatsapp,
          rt_rw: userData.rt_rw || 'RT 00 / RW 04',
          created_at: userData.created_at,
          is_admin: userData.is_admin || false
        });

      } else {
        let userCredential;
        try {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            throw new Error('Nomor WhatsApp ini sudah terdaftar.');
          } else if (authErr.code === 'auth/weak-password') {
            throw new Error('Kata sandi minimal 6 karakter.');
          } else {
            throw authErr;
          }
        }

        const uid = userCredential.user.uid;
        const newUser: User = {
          id_user: uid,
          nama_lengkap: namaLengkap.trim(),
          no_whatsapp: cleanedPhone,
          rt_rw: rtRw.trim() || 'RT 00 / RW 04',
          created_at: new Date().toISOString(),
          is_admin: isPetugas
        };

        try {
          await setDoc(doc(db, 'users', uid), newUser);
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.CREATE, `users/${uid}`);
        }

        onLoginSuccess(newUser);
      }
    } catch (err: any) {
      let displayMessage = err.message || 'Terjadi kesalahan. Silakan coba lagi.';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed && parsed.error) {
          displayMessage = parsed.error;
        }
      } catch {
        // Not JSON formatted
      }
      setError(displayMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="w-full max-w-md mx-auto bg-card text-card-foreground rounded-[var(--radius)] shadow-lg border border-border overflow-hidden my-auto">
      {/* Brand Header */}
      <div className="bg-primary text-primary-foreground p-5 sm:p-6 text-center border-b border-border">
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">KetemuIn</h2>
        <p className="text-xs text-primary-foreground/80 mt-1">Layanan Lost & Found RW 04</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-muted/40">
        <button
          id="btn-tab-login"
          type="button"
          onClick={() => {
            setIsLogin(true);
            setError('');
          }}
          className={`flex-1 min-h-[44px] py-3 text-center font-medium text-xs tracking-wider transition-colors cursor-pointer ${isLogin
              ? 'text-foreground border-b-2 border-primary bg-card font-semibold'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Masuk
        </button>
        <button
          id="btn-tab-register"
          type="button"
          onClick={() => {
            setIsLogin(false);
            setError('');
          }}
          className={`flex-1 min-h-[44px] py-3 text-center font-medium text-xs tracking-wider transition-colors cursor-pointer ${!isLogin
              ? 'text-foreground border-b-2 border-primary bg-card font-semibold'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Daftar Baru
        </button>
      </div>

      {/* Form Content */}
      <div className="p-4 sm:p-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 rounded-[var(--radius)] border border-error bg-error-background p-3 mb-4 text-xs sm:text-sm text-foreground"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-error mt-0.5" />
            <p className="flex-1 leading-relaxed">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <label htmlFor="register-name" className="text-sm font-medium text-foreground block">
                Nama Lengkap
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                  <UserRound className="w-4 h-4" />
                </span>
                <input
                  id="register-name"
                  type="text"
                  placeholder="Nama sesuai KTP / warga"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring text-foreground min-h-[42px]"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {!isLogin && (
            <div className="space-y-1.5">
              <label htmlFor="register-rtrw" className="text-sm font-medium text-foreground block">
                Domisili RT / RW
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                  <MapPin className="w-4 h-4" />
                </span>
                <input
                  id="register-rtrw"
                  type="text"
                  placeholder="Contoh: RT 03 / RW 04"
                  value={rtRw}
                  onChange={handleRtRwChange}
                  pattern="^RT\s*[0-9]{1,3}\s*/\s*RW\s*[0-9]{1,3}$"
                  title="Gunakan format RT 03 / RW 04"
                  maxLength={20}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring text-foreground min-h-[42px]"
                  required
                />
              </div>
              {rtRwWarning && (
                <div className="flex items-center gap-1.5 p-2 rounded-[var(--radius)] border border-warning bg-warning-background text-foreground text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                  <span>{rtRwWarning}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="login-whatsapp" className="text-sm font-medium text-foreground block">
              Nomor WhatsApp
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                <Phone className="w-4 h-4" />
              </span>
              <input
                id="login-whatsapp"
                type="tel"
                inputMode="numeric"
                placeholder="08xxxxxxxxxx"
                value={noWhatsapp}
                onChange={handlePhoneChange}
                maxLength={15}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring text-foreground min-h-[42px]"
                required
              />
            </div>
            {phoneWarning ? (
              <div className="flex items-center gap-1.5 p-2 rounded-[var(--radius)] border border-warning bg-warning-background text-foreground text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                <span>{phoneWarning}</span>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Digunakan untuk verifikasi akun dan menghubungkan kontak antar warga.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-sm font-medium text-foreground block">
              Kata Sandi
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring text-foreground min-h-[42px]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Tampilkan kata sandi"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/*{!isLogin && (
            <div className="flex items-center gap-2 pt-1">
              <input
                id="register-is-petugas"
                type="checkbox"
                checked={isPetugas}
                onChange={(e) => setIsPetugas(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
              />
              <label htmlFor="register-is-petugas" className="text-xs text-foreground cursor-pointer select-none flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                Daftar sebagai Petugas RW 04
              </label>
            </div>
          )}*/}

          <button
            id="btn-auth-submit"
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-primary hover:opacity-90 text-primary-foreground font-semibold min-h-[44px] py-2.5 px-4 rounded-[var(--radius)] transition-opacity text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {loading ? (
              <span>Memproses...</span>
            ) : (
              <>
                <span>{isLogin ? 'Masuk' : 'Daftar Akun'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
