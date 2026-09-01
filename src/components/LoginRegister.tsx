import React, { useState } from 'react';
import { User } from '../types';
import { Eye, EyeOff, KeyRound, Phone, UserRound, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import logo from '../assets/logo-white.png';

interface LoginRegisterProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginRegister({ onLoginSuccess }: LoginRegisterProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [namaLengkap, setNamaLengkap] = useState('');
  const [noWhatsapp, setNoWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPetugas, setIsPetugas] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!noWhatsapp || !password || (!isLogin && !namaLengkap)) {
      setError('Harap lengkapi semua bidang.');
      setLoading(false);
      return;
    }

    const cleanedPhone = noWhatsapp.replace(/[^0-9]/g, '');
    if (cleanedPhone.length < 9) {
      setError('Nomor WhatsApp tidak valid (minimal 9 angka).');
      setLoading(false);
      return;
    }

    const email = `${cleanedPhone}@ketemuin.com`;

    try {
      if (isLogin) {
        // 1. Firebase Sign In
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
            throw new Error('Nomor WhatsApp atau kata sandi salah.');
          } else if (authErr.code === 'auth/invalid-email') {
            throw new Error('Format login tidak valid.');
          } else {
            throw authErr;
          }
        }

        const uid = userCredential.user.uid;
        const userDocRef = doc(db, 'users', uid);
        
        // 2. Fetch User Profile
        let userDoc;
        try {
          userDoc = await getDoc(userDocRef);
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.GET, `users/${uid}`);
        }

        if (!userDoc || !userDoc.exists()) {
          throw new Error('Data profil warga tidak ditemukan di sistem.');
        }

        const userData = userDoc.data();
        onLoginSuccess({
          id_user: userData.id_user,
          nama_lengkap: userData.nama_lengkap,
          no_whatsapp: userData.no_whatsapp,
          created_at: userData.created_at,
          is_admin: userData.is_admin || false
        });

      } else {
        // 1. Firebase Sign Up
        let userCredential;
        try {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            throw new Error('Nomor WhatsApp ini sudah terdaftar.');
          } else if (authErr.code === 'auth/weak-password') {
            throw new Error('Kata sandi terlalu pendek (minimal 6 karakter).');
          } else {
            throw authErr;
          }
        }

        const uid = userCredential.user.uid;
        const newUser: User = {
          id_user: uid,
          nama_lengkap: namaLengkap,
          no_whatsapp: cleanedPhone,
          created_at: new Date().toISOString(),
          is_admin: isPetugas
        };

        // 2. Save Profile in Firestore
        try {
          await setDoc(doc(db, 'users', uid), newUser);
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.CREATE, `users/${uid}`);
        }

        onLoginSuccess(newUser);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="w-full max-w-md mx-auto bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      {/* Brand Header */}
      <div className="bg-primary px-6 py-8 text-center text-primary-foreground relative">
        <div className="relative z-10">
          <div className="flex justify-center">
            <img className="w-20" src={logo} alt="" />
          </div>
          <h2 className="text-2xl font-extrabold font-sans tracking-tight">KetemuIn</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          id="btn-tab-login"
          type="button"
          onClick={() => {
            setIsLogin(true);
            setError('');
          }}
          className={`flex-1 py-4.5 text-center font-bold text-xs uppercase tracking-wider transition-colors ${
            isLogin
              ? 'text-foreground border-b-2 border-slate-900 bg-accent/50'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/20'
          }`}
        >
          Masuk Akun
        </button>
        <button
          id="btn-tab-register"
          type="button"
          onClick={() => {
            setIsLogin(false);
            setError('');
          }}
          className={`flex-1 py-4.5 text-center font-bold text-xs uppercase tracking-wider transition-colors ${
            !isLogin
              ? 'text-foreground border-b-2 border-slate-900 bg-accent/50'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/20'
          }`}
        >
          Daftar Baru
        </button>
      </div>

      {/* Form Content */}
      <div className="p-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 mb-4 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground block">Nama Lengkap</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <UserRound className="w-4 h-4" />
                </span>
                <input
                  id="register-name"
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-accent border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all text-foreground"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground block">No. WhatsApp</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Phone className="w-4 h-4" />
              </span>
              <input
                id="login-whatsapp"
                type="text"
                placeholder="Contoh: 081234567890"
                value={noWhatsapp}
                onChange={(e) => setNoWhatsapp(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-accent border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all text-foreground"
                required
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Digunakan untuk login dan agar warga lain bisa menghubungi Anda langsung via WhatsApp.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground block">Kata Sandi</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-accent border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all text-foreground"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="flex items-center gap-2 pt-1">
              <input
                id="register-is-petugas"
                type="checkbox"
                checked={isPetugas}
                onChange={(e) => setIsPetugas(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-slate-950"
              />
              <label htmlFor="register-is-petugas" className="text-xs font-bold text-muted-foreground cursor-pointer select-none">
                Saya mendaftar sebagai Petugas RW 04
              </label>
            </div>
          )}

          <button
            id="btn-auth-submit"
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-primary hover:bg-secondary text-primary-foreground font-bold py-2.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </span>
            ) : (
              <>
                {isLogin ? 'Masuk Sekarang' : 'Daftar Akun'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}

