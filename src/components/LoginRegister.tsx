import React, { useState } from 'react';
import { User } from '../types';
import { Eye, EyeOff, KeyRound, Phone, UserRound, ArrowRight } from 'lucide-react';
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
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
          is_admin: false
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
    <div id="login-container" className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Brand Header */}
      <div className="bg-slate-900 px-6 py-8 text-center text-white relative">
        <div className="relative z-10">
          <div className="w-12 h-12 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <span className="text-xl font-bold tracking-tight font-sans text-white">KI</span>
          </div>
          <h2 className="text-2xl font-extrabold font-sans tracking-tight">Ketemu.in</h2>
          <p className="text-slate-400 text-xs mt-1">
            Lost & Found Digital Lingkungan Rukun Tetangga (RT/RW)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        <button
          id="btn-tab-login"
          type="button"
          onClick={() => {
            setIsLogin(true);
            setError('');
          }}
          className={`flex-1 py-4.5 text-center font-bold text-xs uppercase tracking-wider transition-colors ${
            isLogin
              ? 'text-slate-900 border-b-2 border-slate-900 bg-slate-50/50'
              : 'text-slate-400 hover:text-slate-800 hover:bg-slate-50/20'
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
              ? 'text-slate-900 border-b-2 border-slate-900 bg-slate-50/50'
              : 'text-slate-400 hover:text-slate-800 hover:bg-slate-50/20'
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
              <label className="text-xs font-semibold text-slate-600 block">Nama Lengkap</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <UserRound className="w-4 h-4" />
                </span>
                <input
                  id="register-name"
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-slate-800"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 block">No. WhatsApp</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Phone className="w-4 h-4" />
              </span>
              <input
                id="login-whatsapp"
                type="text"
                placeholder="Contoh: 081234567890"
                value={noWhatsapp}
                onChange={(e) => setNoWhatsapp(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-slate-800"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Digunakan untuk login dan agar warga lain bisa menghubungi Anda langsung via WhatsApp.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 block">Kata Sandi</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-slate-800"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="btn-auth-submit"
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 leading-normal">
            Ketemu.in menjamin keaslian data warga dengan mengaitkan nomor WhatsApp untuk menghindari laporan fiktif atau spam demi kenyamanan bersama.
          </p>
        </div>
      </div>
    </div>
  );
}
