import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface SystemInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SystemInfoModal({ isOpen, onClose }: SystemInfoModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] w-[90vw] overflow-hidden flex flex-col bg-white p-0 gap-0">
                <div className="p-6 pb-2 shrink-0">
                    <DialogHeader className="p-0 space-y-2">
                        <DialogTitle className="text-xl font-mono font-bold flex items-center gap-2 text-gray-900">
                            <span className="w-6 h-6 rounded bg-cyan-600 flex items-center justify-center text-white text-xs">i</span>
                            SİSTEM MİMARİSİ VE INSD MANTIĞI
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Seismos Dağıtık Algılama ve Karar Destek Sistemi
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 shrink-0">
                    <Separator />
                </div>

                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    <div className="space-y-6">

                        {/* INSD Section */}
                        <section className="space-y-3">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs border border-purple-200">KRİTİK</span>
                                Implicit Node Silence Detection (INSD)
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Bir node'un susması, sistem tarafından doğrudan değil, çevresindeki fiziksel olayların korelasyonu üzerinden algılanır.
                                Sistem, "A binası sustu mu?" diye sormaz; bunun yerine <strong>olması gereken davranış</strong> ile <strong>olan davranış</strong> arasındaki farkı analiz eder.
                            </p>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid gap-4 grid-cols-1 md:grid-cols-3">
                                <div className="space-y-2">
                                    <div className="text-xs font-mono text-cyan-600 font-bold uppercase">Kanal 1: Olay Korelasyonu</div>
                                    <p className="text-xs text-gray-500">
                                        Komşu binalar şiddetli sarsıntı raporlarken, hedef binadan rapor gelmemesi durumu.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs font-mono text-orange-600 font-bold uppercase">Kanal 2: Heartbeat Kaybı</div>
                                    <p className="text-xs text-gray-500">
                                        Deprem sonrası periyodik "yaşıyorum" (ping) sinyalinin kesilmesi.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs font-mono text-purple-600 font-bold uppercase">Kanal 3: Komşu Anomalisi</div>
                                    <p className="text-xs text-gray-500">
                                        Yan binanın çökmesiyle oluşan ani yük boşalması ve zemin-gerilme değişiminin komşularca algılanması.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-black/90 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto shadow-inner">
                                <div className="mb-2 text-gray-500">// KARAR MEKANİZMASI (DECISION LOGIC)</div>
                                <div className="pl-4">
                                    <span className="text-purple-400">IF</span> (Neighborhood_Avg_Status &ge; <span className="text-red-400">DYNAMIC_THRESHOLD</span>)<br />
                                    <span className="text-purple-400">AND</span> (Target_Node == <span className="text-gray-400">SILENT</span>)<br />
                                    <span className="text-purple-400">THEN</span><br />
                                    &nbsp;&nbsp;Target_Status = <span className="text-purple-400 bg-purple-900/30 px-1">PROBABLE_COLLAPSE (OLASI YIKIM)</span>
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* Distributed Architecture */}
                        <section className="space-y-3">
                            <h3 className="font-bold text-gray-900">Merkezi Olmayan Dağıtık Yapı</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Bu sistem tek bir merkezi sunucuya bağımlı değildir. INSD mantığı, iletişim modülleri sayesinde uç birimlerde (Edge Computing) de çalıştırılabilir.
                                Merkez geçici olarak devre dışı kalsa bile, node'lar komşularının durumunu izleyerek yerel uyarılar üretebilir.
                            </p>
                        </section>

                    </div>
                </div>

                <div className="p-6 pt-2 mt-auto border-t border-gray-100 flex justify-end bg-gray-50/50 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 text-sm font-medium transition-colors"
                    >
                        Anlaşıldı
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
