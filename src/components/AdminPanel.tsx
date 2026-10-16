import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Dish, Reservation } from '../types.ts';
import {
  Shield,
  Lock,
  Key,
  Utensils,
  Calendar,
  Settings as SettingsIcon,
  Upload,
  Trash2,
  Edit,
  Plus,
  Check,
  X,
  Database,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  Phone,
  RefreshCw,
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { refreshDishes, refreshSettings, settings } = useApp();

  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dishes' | 'reservations' | 'settings' | 'security'>('dishes');

  // Login & Setup State
  const [password, setPassword] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Dishes state
  const [adminDishes, setAdminDishes] = useState<Dish[]>([]);
  const [editingDish, setEditingDish] = useState<Partial<Dish> | null>(null);
  const [isNewDish, setIsNewDish] = useState(false);
  const [uploadingDishId, setUploadingDishId] = useState<string | null>(null);
  const [dishStatusMsg, setDishStatusMsg] = useState<string | null>(null);

  // Reservations state
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [resFilter, setResFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');

  // Settings state
  const [formSettings, setFormSettings] = useState<Record<string, string>>({});
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Security state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [secMsg, setSecMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [backups, setBackups] = useState<string[]>([]);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  // Check setup status and authentication on mount
  const checkStatus = async () => {
    try {
      const res = await fetch('/api/admin/setup-status');
      if (res.ok) {
        const data = await res.json();
        setIsSetup(data.isSetup);
      }

      const meRes = await fetch('/api/admin/me');
      if (meRes.ok) {
        setIsAuthenticated(true);
      }
    } catch {
      setIsSetup(true);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // Fetch admin data when authenticated
  const fetchAdminData = async () => {
    if (!isAuthenticated) return;
    try {
      // Fetch dishes
      const dishesRes = await fetch('/api/dishes');
      if (dishesRes.ok) setAdminDishes(await dishesRes.json());

      // Fetch reservations
      const resRes = await fetch(`/api/admin/reservations?status=${resFilter}`);
      if (resRes.ok) setReservations(await resRes.json());

      // Fetch settings
      const setRes = await fetch('/api/settings');
      if (setRes.ok) {
        const s = await setRes.json();
        setFormSettings(s);
      }

      // Fetch backups
      const bRes = await fetch('/api/admin/backups');
      if (bRes.ok) {
        const bData = await bRes.json();
        setBackups(bData.backups || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminData();
    }
  }, [isAuthenticated, resFilter]);

  // First-run setup
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (setupPassword.length < 8) {
      setAuthError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (setupPassword !== setupPasswordConfirm) {
      setAuthError('Les mots de passe ne correspondent pas.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: setupPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Erreur lors de la configuration');
        return;
      }
      setIsSetup(true);
      setIsAuthenticated(true);
    } catch {
      setAuthError('Erreur de connexion');
    } finally {
      setAuthLoading(false);
    }
  };

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Identifiants invalides');
        return;
      }

      setIsAuthenticated(true);
      setPassword('');
    } catch {
      setAuthError('Erreur de connexion');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    setIsAuthenticated(false);
  };

  // Dish Operations
  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDish) return;
    setDishStatusMsg(null);

    const isNew = isNewDish;
    const url = isNew ? '/api/admin/dishes' : `/api/admin/dishes/${editingDish.id}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDish),
      });

      if (!res.ok) {
        const err = await res.json();
        setDishStatusMsg(err.error || 'Erreur lors de l’enregistrement');
        return;
      }

      setEditingDish(null);
      setIsNewDish(false);
      fetchAdminData();
      refreshDishes();
    } catch {
      setDishStatusMsg('Erreur de connexion');
    }
  };

  const handleDeleteDish = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plat ?')) return;
    try {
      const res = await fetch(`/api/admin/dishes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAdminData();
        refreshDishes();
      }
    } catch {}
  };

  const handlePhotoUpload = async (dishId: string, file: File) => {
    setUploadingDishId(dishId);
    setDishStatusMsg(null);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch(`/api/admin/dishes/${dishId}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erreur lors du traitement de l’image');
        return;
      }

      fetchAdminData();
      refreshDishes();
    } catch {
      alert('Erreur réseau lors du téléversement');
    } finally {
      setUploadingDishId(null);
    }
  };

  // Reservation Operations
  const handleUpdateResStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchAdminData();
    } catch {}
  };

  const handleDeleteRes = async (id: string) => {
    if (!confirm('Supprimer définitivement cette réservation ?')) return;
    try {
      const res = await fetch(`/api/admin/reservations/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAdminData();
    } catch {}
  };

  // Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formSettings),
      });
      if (res.ok) {
        setSettingsSaved(true);
        refreshSettings();
        setTimeout(() => setSettingsSaved(false), 3000);
      }
    } catch {}
  };

  // Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecMsg(null);
    if (newPassword.length < 8) {
      setSecMsg({ text: 'Le nouveau mot de passe doit comporter au moins 8 caractères.', error: true });
      return;
    }
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSecMsg({ text: data.error || 'Erreur lors du changement', error: true });
        return;
      }
      setSecMsg({ text: data.message || 'Mot de passe modifié avec succès !', error: false });
      setOldPassword('');
      setNewPassword('');
    } catch {
      setSecMsg({ text: 'Erreur réseau', error: true });
    }
  };

  // Trigger Backup
  const handleTriggerBackup = async () => {
    setBackupMsg('Création de la sauvegarde en cours...');
    try {
      const res = await fetch('/api/admin/backup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setBackupMsg(`Sauvegarde réussie : ${data.filename}`);
        setBackups(data.backups || []);
      } else {
        setBackupMsg('Échec de la sauvegarde');
      }
    } catch {
      setBackupMsg('Erreur de connexion');
    }
  };

  // -------------------------------------------------------------
  // Unauthenticated: First-run Setup or Login
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-stone-900 border border-amber-600/40 rounded-3xl p-8 shadow-2xl relative">
          
          <a
            href="#"
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 mb-6 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour au restaurant</span>
          </a>

          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="font-moroccan font-bold text-2xl text-stone-100">
              {isSetup ? 'Espace Administration' : 'Initialisation Propriétaire'}
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Coeur de Bouskoura • Gestion Restaurant
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          {!isSetup ? (
            /* First run: Owner sets password */
            <form onSubmit={handleSetup} className="space-y-4">
              <p className="text-xs text-amber-300 bg-amber-950/40 p-3 rounded-xl border border-amber-800/40 leading-relaxed">
                Première utilisation : Définissez le mot de passe d’administration sécurisé (minimum 8 caractères).
              </p>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Nouveau Mot de Passe (min 8 car.)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-amber-900/40 focus:border-amber-500 text-sm text-stone-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Confirmer le Mot de Passe
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={setupPasswordConfirm}
                  onChange={(e) => setSetupPasswordConfirm(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-amber-900/40 focus:border-amber-500 text-sm text-stone-100 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 rounded-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm tracking-wide shadow-lg disabled:opacity-50"
              >
                {authLoading ? 'Configuration...' : 'Activer l’accès administrateur'}
              </button>
            </form>
          ) : (
            /* Login Form with IP Lockout handling */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Mot de passe d’administration
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-amber-900/40 focus:border-amber-500 text-sm text-stone-100 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 rounded-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm tracking-wide shadow-lg disabled:opacity-50"
              >
                {authLoading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>
          )}

        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Authenticated Admin Dashboard
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      
      {/* Admin Header */}
      <header className="bg-stone-900/90 border-b border-amber-900/30 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="#"
              className="p-2 rounded-xl bg-stone-800 text-stone-300 hover:text-white transition-colors"
              title="Retour au site public"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div>
              <h1 className="font-moroccan font-bold text-lg sm:text-xl text-amber-300">
                Coeur de Bouskoura • Administration
              </h1>
              <span className="text-xs text-stone-400">Session active sécurisée (SHA-256)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-full border border-rose-800/50 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 text-xs font-semibold transition-colors"
          >
            Déconnexion
          </button>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { id: 'dishes', label: 'Carte & Plats', icon: Utensils },
            { id: 'reservations', label: `Réservations (${reservations.length})`, icon: Calendar },
            { id: 'settings', label: 'Paramètres Restaurant', icon: SettingsIcon },
            { id: 'security', label: 'Sécurité & Sauvegardes', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-600 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ========================================================= */}
        {/* TAB 1: DISHES CRUD & PHOTO UPLOAD                         */}
        {/* ========================================================= */}
        {activeTab === 'dishes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-moroccan text-stone-100">
                  Gestion de la Carte des Plats ({adminDishes.length})
                </h2>
                <p className="text-xs text-stone-400">
                  Ajout, modification, téléversement de photos (re-encodage WebP & suppression EXIF).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingDish({
                    name_ar: '',
                    name_fr: '',
                    desc_ar: '',
                    desc_fr: '',
                    price: 45,
                    category: 'mains',
                    available: 1,
                    featured: 0,
                    sort_order: adminDishes.length + 1,
                    image: '',
                  });
                  setIsNewDish(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Plat</span>
              </button>
            </div>

            {dishStatusMsg && (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800/40 text-amber-300 text-xs">
                {dishStatusMsg}
              </div>
            )}

            {/* Dishes Table */}
            <div className="bg-stone-900 border border-amber-900/30 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-stone-950/70 text-amber-400 font-moroccan uppercase tracking-wider text-[11px] border-b border-amber-900/30">
                    <tr>
                      <th className="p-4">Photo</th>
                      <th className="p-4">Plat (FR / AR)</th>
                      <th className="p-4">Prix</th>
                      <th className="p-4">Catégorie</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-900/20 text-stone-200">
                    {adminDishes.map((dish) => (
                      <tr key={dish.id} className="hover:bg-stone-800/40 transition-colors">
                        <td className="p-4 w-20">
                          {dish.image ? (
                            <img
                              src={dish.image}
                              alt={dish.name_fr}
                              className="w-14 h-14 rounded-xl object-cover border border-amber-900/30"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-stone-950 flex items-center justify-center text-[10px] text-stone-500 border border-stone-800">
                              Sans photo
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-stone-100">{dish.name_fr}</div>
                          <div className="text-amber-400 font-arabic-title text-sm">{dish.name_ar}</div>
                        </td>
                        <td className="p-4 font-mono font-bold text-amber-400">{dish.price} DH</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full bg-stone-800 text-[11px] text-stone-300 font-mono">
                            {dish.category}
                          </span>
                        </td>
                        <td className="p-4">
                          {dish.available ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[11px] font-medium">
                              Disponible
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800/40 text-[11px] font-medium">
                              Épuisé
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {/* Photo upload trigger */}
                          <label className="inline-flex items-center gap-1 p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 cursor-pointer" title="Téléverser photo (WebP/JPG)">
                            <Upload className="w-4 h-4" />
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={uploadingDishId === dish.id}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handlePhotoUpload(dish.id, f);
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingDish(dish);
                              setIsNewDish(false);
                            }}
                            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDish(dish.id)}
                            className="p-2 rounded-lg bg-stone-800 hover:bg-rose-900/40 text-stone-400 hover:text-rose-400"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dish Modal for Add / Edit */}
            {editingDish && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
                <div className="bg-stone-900 border border-amber-600/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-moroccan font-bold text-xl text-amber-300">
                      {isNewDish ? 'Ajouter un Plat' : 'Modifier le Plat'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingDish(null)}
                      className="p-2 rounded-full bg-stone-800 text-stone-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveDish} className="space-y-4 text-xs sm:text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-stone-400 font-semibold mb-1">Nom en Français *</label>
                        <input
                          type="text"
                          required
                          value={editingDish.name_fr || ''}
                          onChange={(e) => setEditingDish({ ...editingDish, name_fr: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-400 font-semibold mb-1">Nom en Arabe *</label>
                        <input
                          type="text"
                          required
                          dir="rtl"
                          value={editingDish.name_ar || ''}
                          onChange={(e) => setEditingDish({ ...editingDish, name_ar: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100 font-arabic-title"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-stone-400 font-semibold mb-1">Description (FR) *</label>
                      <textarea
                        required
                        rows={2}
                        value={editingDish.desc_fr || ''}
                        onChange={(e) => setEditingDish({ ...editingDish, desc_fr: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-400 font-semibold mb-1">Description (AR) *</label>
                      <textarea
                        required
                        rows={2}
                        dir="rtl"
                        value={editingDish.desc_ar || ''}
                        onChange={(e) => setEditingDish({ ...editingDish, desc_ar: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100 font-arabic-title"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-stone-400 font-semibold mb-1">Prix (DH) *</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={editingDish.price || 0}
                          onChange={(e) => setEditingDish({ ...editingDish, price: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-400 font-semibold mb-1">Catégorie *</label>
                        <select
                          value={editingDish.category || 'mains'}
                          onChange={(e) => setEditingDish({ ...editingDish, category: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100"
                        >
                          <option value="starters">Entrées & Salades</option>
                          <option value="mains">Plats & Tajines</option>
                          <option value="grills">Grillades</option>
                          <option value="desserts">Desserts</option>
                          <option value="drinks">Boissons & Thés</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-stone-400 font-semibold mb-1">Ordre de tri</label>
                        <input
                          type="number"
                          value={editingDish.sort_order || 0}
                          onChange={(e) => setEditingDish({ ...editingDish, sort_order: parseInt(e.target.value, 10) || 0 })}
                          className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!editingDish.available}
                          onChange={(e) => setEditingDish({ ...editingDish, available: e.target.checked ? 1 : 0 })}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-stone-300 font-medium">Disponible à la vente</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!editingDish.featured}
                          onChange={(e) => setEditingDish({ ...editingDish, featured: e.target.checked ? 1 : 0 })}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-stone-300 font-medium">Spécialité Maison (Vedette)</span>
                      </label>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingDish(null)}
                        className="px-5 py-2.5 rounded-full bg-stone-800 text-stone-300 hover:text-white"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: RESERVATIONS                                       */}
        {/* ========================================================= */}
        {activeTab === 'reservations' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-moroccan text-stone-100">
                  Réservations Clients ({reservations.length})
                </h2>
                <p className="text-xs text-stone-400">
                  Vérification, confirmation, annulation et suppression des réservations.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 bg-stone-900 p-1 rounded-xl border border-amber-900/30">
                {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setResFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      resFilter === st
                        ? 'bg-amber-600 text-stone-950'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {st === 'all' ? 'Toutes' : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-stone-900 border border-amber-900/30 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-stone-950/70 text-amber-400 font-moroccan uppercase tracking-wider text-[11px] border-b border-amber-900/30">
                    <tr>
                      <th className="p-4">Client</th>
                      <th className="p-4">Téléphone</th>
                      <th className="p-4">Date & Heure</th>
                      <th className="p-4">Convives</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4">Demande spéciale</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-900/20 text-stone-200">
                    {reservations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-stone-500">
                          Aucune réservation trouvée pour ce filtre.
                        </td>
                      </tr>
                    ) : (
                      reservations.map((r) => (
                        <tr key={r.id} className="hover:bg-stone-800/40 transition-colors">
                          <td className="p-4 font-semibold text-stone-100">{r.name}</td>
                          <td className="p-4 font-mono text-amber-400">{r.phone}</td>
                          <td className="p-4">
                            <span className="font-semibold text-stone-200">{r.date}</span> à{' '}
                            <span className="font-mono text-amber-300">{r.time}</span>
                          </td>
                          <td className="p-4 font-bold font-mono">{r.guests} pers.</td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                                r.status === 'confirmed'
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                                  : r.status === 'cancelled'
                                  ? 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                                  : 'bg-amber-950/60 text-amber-400 border-amber-800/40'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="p-4 text-stone-400 max-w-xs truncate">{r.note || '-'}</td>
                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleUpdateResStatus(r.id, 'confirmed')}
                              className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-800 text-emerald-400 border border-emerald-700/50"
                              title="Confirmer la réservation"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateResStatus(r.id, 'cancelled')}
                              className="p-1.5 rounded-lg bg-amber-950 hover:bg-amber-800 text-amber-400 border border-amber-700/50"
                              title="Annuler la réservation"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRes(r.id)}
                              className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-800 text-rose-400 border border-rose-700/50"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: RESTAURANT SETTINGS                                */}
        {/* ========================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h2 className="text-xl font-bold font-moroccan text-stone-100">
                Paramètres du Restaurant
              </h2>
              <p className="text-xs text-stone-400">
                Informations publiques, coordonnées, horaires d’ouverture et textes d’accueil.
              </p>
            </div>

            {settingsSaved && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Paramètres enregistrés avec succès ! Le cache du chatbot a été actualisé.</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="bg-stone-900 border border-amber-900/30 rounded-2xl p-6 sm:p-8 space-y-6">
              
              {/* Coordonnées */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-400 mb-1">
                    Numéro Téléphone Standard
                  </label>
                  <input
                    type="text"
                    value={formSettings.phone || ''}
                    onChange={(e) => setFormSettings({ ...formSettings, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-400 mb-1">
                    WhatsApp Mobile (format 212XXXXXXXXX)
                  </label>
                  <input
                    type="text"
                    value={formSettings.whatsapp || ''}
                    onChange={(e) => setFormSettings({ ...formSettings, whatsapp: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Horaires et Validation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-400 mb-1">
                    Heure d’Ouverture (validation réservations, ex: 12:00)
                  </label>
                  <input
                    type="text"
                    value={formSettings.opening_time || '12:00'}
                    onChange={(e) => setFormSettings({ ...formSettings, opening_time: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-400 mb-1">
                    Heure de Fermeture (validation réservations, ex: 23:30)
                  </label>
                  <input
                    type="text"
                    value={formSettings.closing_time || '23:30'}
                    onChange={(e) => setFormSettings({ ...formSettings, closing_time: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Textes bilingues des horaires */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Horaires affichés (FR)</label>
                  <input
                    type="text"
                    value={formSettings.hours_fr || ''}
                    onChange={(e) => setFormSettings({ ...formSettings, hours_fr: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Horaires affichés (AR)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formSettings.hours_ar || ''}
                    onChange={(e) => setFormSettings({ ...formSettings, hours_ar: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100 text-sm font-arabic-title"
                  />
                </div>
              </div>

              {/* Slogans */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Slogan (FR)</label>
                  <input
                    type="text"
                    value={formSettings.tagline_fr || ''}
                    onChange={(e) => setFormSettings({ ...formSettings, tagline_fr: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Slogan (AR)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formSettings.tagline_ar || ''}
                    onChange={(e) => setFormSettings({ ...formSettings, tagline_ar: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100 text-sm font-arabic-title"
                  />
                </div>
              </div>

              {/* Adresses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Adresse (FR)</label>
                  <input
                    type="text"
                    value={formSettings.address_fr || ''}
                    onChange={(e) => setFormSettings({ ...formSettings, address_fr: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Adresse (AR)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formSettings.address_ar || ''}
                    onChange={(e) => setFormSettings({ ...formSettings, address_ar: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100 text-sm font-arabic-title"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-8 py-3 rounded-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm shadow-md"
                >
                  Enregistrer les paramètres
                </button>
              </div>

            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SECURITY & BACKUPS                                 */}
        {/* ========================================================= */}
        {activeTab === 'security' && (
          <div className="max-w-3xl space-y-8">
            <div>
              <h2 className="text-xl font-bold font-moroccan text-stone-100">
                Sécurité & Sauvegardes SQLite
              </h2>
              <p className="text-xs text-stone-400">
                Changement de mot de passe maître (avec révocation des autres sessions) et instantané de la base de données.
              </p>
            </div>

            {/* Change Password Card */}
            <div className="bg-stone-900 border border-amber-900/30 rounded-2xl p-6 sm:p-8 space-y-4">
              <h3 className="font-moroccan font-bold text-base text-amber-300 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Changer le Mot de Passe Administrateur</span>
              </h3>

              {secMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    secMsg.error
                      ? 'bg-rose-950/60 border border-rose-800/40 text-rose-300'
                      : 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-300'
                  }`}
                >
                  {secMsg.error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  <span>{secMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Ancien Mot de Passe</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Nouveau Mot de Passe (min 8 car.)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-900/30 text-stone-100"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs tracking-wide shadow-md"
                >
                  Mettre à jour et déconnecter les autres sessions
                </button>
              </form>
            </div>

            {/* SQLite Atomic VACUUM INTO Backup Card */}
            <div className="bg-stone-900 border border-amber-900/30 rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-moroccan font-bold text-base text-amber-300 flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-400" />
                    <span>Sauvegarde Atomique SQLite (VACUUM INTO)</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Génère une copie saine et intègre de la base de données, excluant les secrets (.env) et les journaux WAL/SHM.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerBackup}
                  className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Créer une Sauvegarde</span>
                </button>
              </div>

              {backupMsg && (
                <div className="p-3 rounded-xl bg-stone-950 text-xs text-amber-300 border border-amber-900/30 font-mono">
                  {backupMsg}
                </div>
              )}

              {/* Backups List */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-stone-400 block mb-2">
                  Sauvegardes existantes ({backups.length}) :
                </span>
                {backups.length === 0 ? (
                  <p className="text-xs text-stone-500 italic">Aucune sauvegarde générée pour le moment.</p>
                ) : (
                  <ul className="space-y-1.5 font-mono text-xs text-stone-300">
                    {backups.map((b) => (
                      <li key={b} className="p-2 rounded-lg bg-stone-950/80 border border-stone-800 flex items-center justify-between">
                        <span>{b}</span>
                        <span className="text-emerald-400 text-[10px]">Prête</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};
