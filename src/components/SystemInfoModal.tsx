'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function SystemInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-slate-900/90 backdrop-blur border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        Seismos Nasıl Çalışır?
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-12">

                    {/* 1. MİMARİ */}
                    <section>
                        <h3 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2">
                            <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                            Sistem Mimarisi
                        </h3>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    NB-IoT Sensör Ağı
                                </h4>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Her bina, 10 yıllık pil ömrüne sahip, hücresel <strong>NB-IoT (Narrowband IoT)</strong> modüllü akıllı akselerometreler ile donatılmıştır. Bu sensörler normalde uyku modundadır ancak bir titreşim algıladıklarında milisaniyeler içinde uyanıp veri göndermeye başlarlar.
                                </p>
                            </div>
                            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    Edge Computing (Uçta Hesaplama)
                                </h4>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Ham veri sunucuya gitmeden önce sensör üzerinde işlenir. <strong>Hızlı Fourier Dönüşümü (FFT)</strong> ile binanın doğal frekansı anlık olarak hesaplanır. Sadece kritik değişimler raporlanır, bu da bant genişliğinden %99 tasarruf sağlar.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 2. INSD (DEDEKTİF) */}
                    <section>
                        <h3 className="text-xl font-bold text-orange-400 mb-6 flex items-center gap-2">
                            <span className="w-2 h-8 bg-orange-500 rounded-full"></span>
                            INSD: Sessizliğin Sesi
                        </h3>
                        <div className="bg-gradient-to-r from-orange-900/20 to-slate-900 border border-orange-500/30 rounded-2xl p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <svg className="w-64 h-64 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>

                            <h4 className="text-lg font-bold text-white mb-4">Implicit Node Silence Detection (Gizli Düğüm Sessizliği Tespiti)</h4>
                            <p className="text-slate-300 mb-6 max-w-2xl leading-relaxed">
                                En kötü senaryoda (bina tamamen çöktüğünde), sensör de yok olur ve veri gönderemez. Klasik sistemler bunu "bağlantı hatası" sanır. Seismos ise bunu bir <strong>delil</strong> olarak kullanır.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-black/40 p-4 rounded-lg border border-white/10">
                                    <div className="text-orange-400 font-bold mb-1">1. Aşama</div>
                                    <div className="text-xs text-slate-400">Bir deprem sırasında bir sensör aniden susarsa sistem alarma geçer.</div>
                                </div>
                                <div className="bg-black/40 p-4 rounded-lg border border-white/10">
                                    <div className="text-orange-400 font-bold mb-1">2. Aşama (Konsensus)</div>
                                    <div className="text-xs text-slate-400">Sistem komşu binalara sorar: "Siz sallanıyor musunuz?"</div>
                                </div>
                                <div className="bg-black/40 p-4 rounded-lg border border-white/10">
                                    <div className="text-orange-400 font-bold mb-1">3. Aşama (Karar)</div>
                                    <div className="text-xs text-slate-400">Eğer komşular "Evet" derse ve o bina suskuns, sistem <strong>"Yıkım Tahmini"</strong> yapar ve haritada işaretler.</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 3. YAPISAL HAFIZA */}
                    <section>
                        <h3 className="text-xl font-bold text-pink-400 mb-6 flex items-center gap-2">
                            <span className="w-2 h-8 bg-pink-500 rounded-full"></span>
                            Frekans Histeresisi (Yapısal Hafıza)
                        </h3>
                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            <div className="flex-1 space-y-4">
                                <p className="text-slate-300 leading-relaxed">
                                    Binalar canlı gibidir; hasar aldıklarında "sesleri" değişir. Sağlam bir bina serttir ve yüksek frekansta (hızlı) titreşir. Hasar alan bina ise "yumuşar" ve titreşim frekansı düşer.
                                </p>
                                <p className="text-slate-300 leading-relaxed">
                                    Seismos, deprem bittikten sonra bile binanın bu yeni "tonunu" hatırlar. Panelde gördüğünüz frekans düşüşü (örn: 4.5Hz → 1.2Hz), binanın kolonlarında kalıcı hasar olduğunun matematiksel kanıtıdır.
                                </p>
                            </div>
                            <div className="flex-1 bg-slate-800/50 p-6 rounded-xl border border-slate-700 w-full">
                                <div className="flex justify-between text-xs text-slate-400 mb-2">
                                    <span>Sağlam (4.5 Hz)</span>
                                    <span>Yıkık (1.0 Hz)</span>
                                </div>
                                <div className="h-4 bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 rounded-full w-full mb-2"></div>
                                <div className="text-center text-white text-sm font-mono">Yapısal Bütünlük Spektrumu</div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 text-center">
                    <p className="text-slate-500 text-xs">
                        © 2024 Seismos Teknoloji A.Ş. | NB-IoT & Edge Computing Powered
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
