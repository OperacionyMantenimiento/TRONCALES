import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../services/supabaseClient'; // Importación añadida

const Icon = ({ name, className }) => {
    const LucideIcon = LucideIcons[name];
    if (!LucideIcon) return null;
    return <LucideIcon className={className} />;
};

const phaseConfig = {
    fase1: {
        title: "Fase 1: Auditoría y Diagnóstico", iconName: "Activity", iconClass: "w-5 h-5 text-blue-500",
        tasks: [{ id: 'otdr', label: 'Barrido Reflectométrico (OTDR) y Trazas' }, { id: 'kmz', label: 'Actualización Planimétrica (KMZ)' }, { id: 'inventario', label: 'Levantamiento e Inventario de Materiales' }]
    },
    fase2: {
        title: "Fase 2: Mantenimiento y Despeje", iconName: "Scissors", iconClass: "w-5 h-5 text-emerald-500",
        tasks: [{ id: 'picaPoda', label: 'Pica y Poda estandarizada (6m x 1m)' }]
    },
    fase3: {
        title: "Fase 3: Recuperación Óptica", iconName: "Link2", iconClass: "w-5 h-5 text-amber-500",
        tasks: [{ id: 'mangas', label: 'Reacondicionamiento de Mangas (Cierres)' }, { id: 'fusion', label: 'Fusión de Hilos Abiertos (Continuidad A-B)' }, { id: 'certificacion', label: 'Certificación Final OTDR de Hilos Disponibles' }]
    },
    fase4: {
        title: "Fase 4: Control y Logística", iconName: "ShieldCheck", iconClass: "w-5 h-5 text-purple-500",
        tasks: [{ id: 'entregables', label: 'Entregables Semanales (Fotos, KMZ, Actas)' }]
    }
};

export default function DashboardTroncales({ session }) {
    // INICIALIZAR EL ESTADO COMO ARRAY VACÍO
    const [tramos, setTramos] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [selectedTramo, setSelectedTramo] = useState(null);
    const [toast, setToast] = useState(null);
    
    // Filtros
    const [regionFilter, setRegionFilter] = useState('Todas');
    const [estadoFilter, setEstadoFilter] = useState('Todos');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [ejecutorFilter, setEjecutorFilter] = useState('Todos');
    
    // Edición y Creación
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newTramo, setNewTramo] = useState({ 
        name: '', region: '', estado: '', km: '', hilos: '', mangas: '', reservas: '', 
        postFibex: '', postEdc: '', postCantv: '', postOtros: '', notes: '', ejecutorType: 'FIBEX', contratistaName: '' 
    });
    const [expandedHilos, setExpandedHilos] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // 1. CARGAR DATOS REALES DESDE SUPABASE
    useEffect(() => {
        fetchTramos();
    }, []);

    const fetchTramos = async () => {
        setIsLoadingData(true);
        try {
            const { data, error } = await supabase
                .from('control_red_troncal')
                .select('*')
                .order('id', { ascending: true });
            
            if (error) throw error;
            setTramos(data || []);
        } catch (error) {
            showToast('Error cargando tramos de la base de datos', 'error');
        } finally {
            setIsLoadingData(false);
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const validateMangasLimit = (km, mangas) => {
        const numKm = Number(km) || 0;
        const numMangas = Number(mangas) || 0;
        const maxPermitidas = numKm * 3;
        return { excede: numMangas > maxPermitidas, maxPermitidas };
    };

    const exportToExcel = () => {
        if (!window.XLSX) return showToast('Error cargando librería de Excel', 'error');
        const exportData = tramos.map(t => ({
            'ID': t.id, 'Nombre del Tramo': t.name, 'Región': t.region, 'Estado': t.estado,
            'Kilómetros': t.km, 'Hilos': t.hilos, 'Ejecutor': t.ejecutor || 'FIBEX (Interno)',
            'Estatus': t.status, 'Progreso (%)': t.progress, 'Notas': t.notes
        }));
        const worksheet = window.XLSX.utils.json_to_sheet(exportData);
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, "Tramos");
        window.XLSX.writeFile(workbook, "Estatus_Red_Troncal.xlsx");
        showToast('Reporte Excel descargado', 'success');
    };

    const exportToPDF = () => {
        if (!window.jspdf || !window.jspdf.jsPDF) return showToast('Error cargando librería de PDF', 'error');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');
        doc.setFontSize(16);
        doc.text("Reporte de Estatus - Red Troncal Nacional", 14, 15);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 22);

        const tableColumn = ["ID", "Nombre de Troncal", "Región", "Estado", "Km", "Hilos", "Ejecutor", "Estatus", "Avance"];
        const tableRows = tramos.map(t => [
            t.id, t.name, t.region, t.estado, `${t.km} km`, t.hilos, 
            t.ejecutor || 'FIBEX (Interno)', t.status, `${t.progress}%`
        ]);

        doc.autoTable({
            head: [tableColumn], body: tableRows, startY: 28, theme: 'grid', styles: { fontSize: 9 },
            headStyles: { fillColor: [37, 99, 235] }, alternateRowStyles: { fillColor: [248, 250, 252] }
        });
        doc.save("Estatus_Red_Troncal.pdf");
        showToast('Reporte PDF descargado', 'success');
    };

    // 2. SUBIDA REAL DE ARCHIVOS A SUPABASE STORAGE
    const handleFileUpload = async (tramoId, faseKey, taskKey, event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setIsUploading(true);
        
        try {
            const currentTramo = tramos.find(t => t.id === tramoId);
            const currentAttachments = currentTramo.attachments || { fase1: {}, fase2: {}, fase3: {}, fase4: {} };
            const taskAttachments = currentAttachments[faseKey]?.[taskKey] || [];
            
            const uploadedFilesArray = [];

            for (const file of files) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${tramoId}_${faseKey}_${taskKey}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                const filePath = `${tramoId}/${fileName}`;

                const { error: uploadError } = await supabase.storage.from('soportes_troncales').upload(filePath, file);
                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage.from('soportes_troncales').getPublicUrl(filePath);

                uploadedFilesArray.push({
                    id: fileName,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    url: publicUrlData.publicUrl,
                    path: filePath
                });
            }

            const updatedAttachments = { 
                ...currentAttachments, 
                [faseKey]: { 
                    ...(currentAttachments[faseKey] || {}), 
                    [taskKey]: [...taskAttachments, ...uploadedFilesArray] 
                } 
            };

            const { error: updateError } = await supabase
                .from('control_red_troncal')
                .update({ attachments: updatedAttachments })
                .eq('id', tramoId);

            if (updateError) throw updateError;

            const updatedTramo = { ...currentTramo, attachments: updatedAttachments };
            setTramos(prev => prev.map(t => t.id === tramoId ? updatedTramo : t));
            if (selectedTramo && selectedTramo.id === tramoId) setSelectedTramo(updatedTramo);
            
            showToast(`${files.length} archivo(s) guardado(s) en la nube`, 'success');
        } catch (error) {
            showToast('Error al subir archivos', 'error');
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    // 3. ELIMINAR ARCHIVOS DEL STORAGE Y BASE DE DATOS
    const handleRemoveFile = async (tramoId, faseKey, taskKey, fileObj) => {
        try {
            const { error: storageError } = await supabase.storage.from('soportes_troncales').remove([fileObj.path]);
            if (storageError) throw storageError;

            const currentTramo = tramos.find(t => t.id === tramoId);
            const currentAttachments = currentTramo.attachments;
            const updatedTaskAttachments = currentAttachments[faseKey][taskKey].filter(f => f.id !== fileObj.id);
            
            const updatedAttachments = { ...currentAttachments, [faseKey]: { ...currentAttachments[faseKey], [taskKey]: updatedTaskAttachments } };
            
            const { error: dbError } = await supabase.from('control_red_troncal').update({ attachments: updatedAttachments }).eq('id', tramoId);
            if (dbError) throw dbError;

            const updatedTramo = { ...currentTramo, attachments: updatedAttachments };
            setTramos(prev => prev.map(t => t.id === tramoId ? updatedTramo : t));
            if (selectedTramo && selectedTramo.id === tramoId) setSelectedTramo(updatedTramo);
            
            showToast('Documento eliminado de la nube', 'info');
        } catch (error) {
            showToast('Error al eliminar archivo', 'error');
        }
    };

    const handleEditClick = () => { setEditData({ ...selectedTramo }); setIsEditing(true); };
    const handleCancelEdit = () => { setIsEditing(false); setEditData(null); };

    // 4. GUARDAR EDICIÓN BÁSICA EN SUPABASE
    const handleSaveEdit = async () => {
        try {
            const updatedFields = { 
                name: editData.name, region: editData.region, estado: editData.estado, 
                km: editData.km, hilos: editData.hilos, ejecutor: editData.ejecutor, notes: editData.notes 
            };
            
            const { error } = await supabase.from('control_red_troncal').update(updatedFields).eq('id', editData.id);
            if (error) throw error;

            setTramos(prev => prev.map(t => t.id === editData.id ? { ...t, ...updatedFields } : t));
            setSelectedTramo(prev => ({ ...prev, ...updatedFields }));
            setIsEditing(false);
            showToast('Cambios guardados en la base de datos', 'success');
        } catch (error) {
            showToast('Error al actualizar registro', 'error');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: name === 'km' || name === 'hilos' ? Number(value) : value }));
    };

    const handleCreateChange = (e) => {
        const { name, value } = e.target;
        setNewTramo(prev => ({ ...prev, [name]: value }));
    };

    // 5. CREAR NUEVO REGISTRO EN SUPABASE
    const handleCreateSubmit = async () => {
        if (!newTramo.name.trim()) return showToast('El nombre del tramo es obligatorio', 'error');
        
        const kmVal = Number(newTramo.km) || 0;
        const mangasVal = Number(newTramo.mangas) || 0;
        const validation = validateMangasLimit(kmVal, mangasVal);
        if (validation.excede) return showToast(`Advertencia: El máx. permitido son 3 mangas por km (${validation.maxPermitidas})`, 'error');
        
        const ejecutorFinal = newTramo.ejecutorType === 'FIBEX' ? 'FIBEX (Interno)' : (newTramo.contratistaName.trim() || 'Contratista Sin Nombre');
        
        const newEntry = {
            name: newTramo.name, region: newTramo.region || 'Sin especificar', estado: newTramo.estado || 'Sin especificar',
            km: Number(newTramo.km) || 0, hilos: Number(newTramo.hilos) || 0, mangas: Number(newTramo.mangas) || 0, reservas: Number(newTramo.reservas) || 0,
            postores: { fibex: Number(newTramo.postFibex) || 0, edc: Number(newTramo.postEdc) || 0, cantv: Number(newTramo.postCantv) || 0, otros: Number(newTramo.postOtros) || 0 },
            ejecutor: ejecutorFinal, status: "Pendiente", progress: 0,
            fases: { fase1: { otdr: false, kmz: false, inventario: false }, fase2: { picaPoda: false }, fase3: { mangas: false, fusion: false, certificacion: false }, fase4: { entregables: false } },
            attachments: { fase1: {}, fase2: {}, fase3: {}, fase4: {} }, hilos_distancias: {}, notes: newTramo.notes || 'Tramo recién registrado.'
        };

        try {
            const { data, error } = await supabase.from('control_red_troncal').insert([newEntry]).select();
            if (error) throw error;

            setTramos(prev => [...prev, data[0]]);
            setIsCreating(false);
            setNewTramo({ name: '', region: '', estado: '', km: '', hilos: '', mangas: '', reservas: '', postFibex: '', postEdc: '', postCantv: '', postOtros: '', notes: '', ejecutorType: 'FIBEX', contratistaName: '' });
            showToast('Nueva troncal registrada en la nube', 'success');
        } catch (error) {
            showToast('Error creando troncal', 'error');
        }
    };

    // 6. ACTUALIZAR MEDICIONES OTDR EN SUPABASE
    const handleHiloDistanceChange = async (tramoId, hiloIndex, value) => {
        const currentTramo = tramos.find(t => t.id === tramoId);
        const updatedDistancias = { ...(currentTramo.hilos_distancias || {}), [hiloIndex]: value };
        
        const updatedTramo = { ...currentTramo, hilos_distancias: updatedDistancias };
        setTramos(prev => prev.map(t => t.id === tramoId ? updatedTramo : t));
        if (selectedTramo && selectedTramo.id === tramoId) setSelectedTramo(updatedTramo);

        await supabase.from('control_red_troncal').update({ hilos_distancias: updatedDistancias }).eq('id', tramoId);
    };

    const calculateProgress = (fases) => {
        let totalTasks = 0, completedTasks = 0;
        Object.keys(fases).forEach(faseKey => {
            Object.keys(fases[faseKey]).forEach(taskKey => {
                totalTasks++;
                if (fases[faseKey][taskKey]) completedTasks++;
            });
        });
        return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    };

    // 7. ACTUALIZAR CHECKBOX DE FASES EN SUPABASE
    const toggleTask = async (tramoId, faseKey, taskKey) => {
        const currentTramo = tramos.find(t => t.id === tramoId);
        const isCompleted = !currentTramo.fases[faseKey][taskKey];
        const updatedFases = { ...currentTramo.fases, [faseKey]: { ...currentTramo.fases[faseKey], [taskKey]: isCompleted } };
        
        const newProgress = calculateProgress(updatedFases);
        let newStatus = "En Progreso";
        if (newProgress === 100) newStatus = "Completado";
        else if (newProgress === 0) newStatus = "Pendiente";
        
        const updatedTramo = { ...currentTramo, fases: updatedFases, progress: newProgress, status: newStatus };
        
        setTramos(prev => prev.map(t => t.id === tramoId ? updatedTramo : t));
        if (selectedTramo && selectedTramo.id === tramoId) setSelectedTramo(updatedTramo);
        
        try {
            const { error } = await supabase.from('control_red_troncal').update({ fases: updatedFases, progress: newProgress, status: newStatus }).eq('id', tramoId);
            if (error) throw error;
            const taskName = phaseConfig[faseKey].tasks.find(t => t.id === taskKey).label;
            showToast(`${isCompleted ? 'Completado' : 'Pendiente'}: ${taskName}`, isCompleted ? 'success' : 'info');
        } catch (error) {
            showToast('Error sincronizando estado', 'error');
            fetchTramos();
        }
    };

    const renderDashboard = () => {
        if (isLoadingData) return <div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

        const totalTramos = tramos.length;
        const completados = tramos.filter(t => t.progress === 100).length;
        const enProgreso = tramos.filter(t => t.progress > 0 && t.progress < 100).length;
        const avgProgress = totalTramos === 0 ? 0 : Math.round(tramos.reduce((acc, curr) => acc + curr.progress, 0) / totalTramos);
        const regions = ['Todas', ...new Set(tramos.map(t => t.region).filter(Boolean))];
        const estadosRaw = tramos.flatMap(t => (t.estado || '').split('/').map(s => s.trim()));
        const estados = ['Todos', ...new Set(estadosRaw.filter(Boolean))];
        const statuses = ['Todos', 'Completado', 'En Progreso', 'Pendiente'];
        const ejecutores = ['Todos', ...new Set(tramos.map(t => t.ejecutor || 'FIBEX (Interno)').filter(Boolean))];

        const filteredTramos = tramos.filter(t => {
            const matchRegion = regionFilter === 'Todas' || t.region === regionFilter;
            const matchEstado = estadoFilter === 'Todos' || (t.estado && t.estado.includes(estadoFilter));
            const matchStatus = statusFilter === 'Todos' || t.status === statusFilter;
            const matchEjecutor = ejecutorFilter === 'Todos' || (t.ejecutor || 'FIBEX (Interno)') === ejecutorFilter;
            return matchRegion && matchEstado && matchStatus && matchEjecutor;
        });

        return (
            <div className="p-4 md:p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Control de Red Troncal Nacional</h1>
                        <p className="text-slate-500">Plan de Recuperación y Mantenimiento Preventivo</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 w-max">
                            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>
                            <span className="text-sm font-medium text-blue-700 hidden lg:inline">Conectado a BD</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"><Icon name="Download" className="w-4 h-4" /> Excel</button>
                            <button onClick={exportToPDF} className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"><Icon name="Download" className="w-4 h-4" /> PDF</button>
                        </div>
                        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors text-sm font-medium"><Icon name="Plus" className="w-4 h-4" /> Nueva Troncal</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg text-blue-600"><Icon name="Map" className="w-6 h-6" /></div><div><p className="text-sm text-slate-500 font-medium">Total Tramos</p><h3 className="text-2xl font-bold text-slate-800">{totalTramos}</h3></div></div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4"><div className="p-3 bg-emerald-100 rounded-lg text-emerald-600"><Icon name="CheckCircle" className="w-6 h-6" /></div><div><p className="text-sm text-slate-500 font-medium">Completados</p><h3 className="text-2xl font-bold text-slate-800">{completados}</h3></div></div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4"><div className="p-3 bg-amber-100 rounded-lg text-amber-600"><Icon name="HardHat" className="w-6 h-6" /></div><div><p className="text-sm text-slate-500 font-medium">En Intervención</p><h3 className="text-2xl font-bold text-slate-800">{enProgreso}</h3></div></div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4"><div className="p-3 bg-purple-100 rounded-lg text-purple-600"><Icon name="BarChart3" className="w-6 h-6" /></div><div><p className="text-sm text-slate-500 font-medium">Avance Nacional</p><h3 className="text-2xl font-bold text-slate-800">{avgProgress}%</h3></div></div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex items-center gap-2 text-slate-600 font-medium shrink-0"><Icon name="Filter" className="w-5 h-5" /><span>Filtros:</span></div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                        <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>{regions.map(r => <option key={r} value={r}>{r === 'Todas' ? 'Todas las Regiones' : r}</option>)}</select>
                        <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none" value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}>{estados.map(e => <option key={e} value={e}>{e === 'Todos' ? 'Todos los Estados' : e}</option>)}</select>
                        <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>{statuses.map(s => <option key={s} value={s}>{s === 'Todos' ? 'Todos los Estatus' : s}</option>)}</select>
                        <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none" value={ejecutorFilter} onChange={(e) => setEjecutorFilter(e.target.value)}>{ejecutores.map(ej => <option key={ej} value={ej}>{ej === 'Todos' ? 'Todos los Ejecutores' : ej}</option>)}</select>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center"><h2 className="text-lg font-semibold text-slate-800">Tramos Asignados</h2><span className="text-sm text-slate-500 font-medium bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">{filteredTramos.length} resultados</span></div>
                    <div className="divide-y divide-slate-100">
                        {filteredTramos.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No hay tramos registrados que coincidan con los filtros.</div>
                        ) : filteredTramos.map((tramo) => (
                            <div key={tramo.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4" onClick={() => { setSelectedTramo(tramo); setExpandedHilos(false); }}>
                                <div className="flex-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                                        <h3 className="text-base font-semibold text-slate-800">{tramo.name}</h3>
                                        <span className={`w-max px-2.5 py-0.5 rounded-full text-xs font-medium border ${tramo.status === 'Completado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : tramo.status === 'En Progreso' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>{tramo.status}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-2 sm:mt-0">
                                        <span className="flex items-center gap-1"><Icon name="Compass" className="w-4 h-4" /> {tramo.region}</span>
                                        <span className="flex items-center gap-1"><Icon name="MapPin" className="w-4 h-4" /> {tramo.estado}</span>
                                        <span className="flex items-center gap-1 text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded-md font-semibold"><Icon name="Route" className="w-3.5 h-3.5" /> {tramo.km} km</span>
                                        <span className="flex items-center gap-1 text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md font-semibold"><Icon name="Layers" className="w-3.5 h-3.5" /> {tramo.hilos} hilos</span>
                                        <span className="flex items-center gap-1 text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded-md font-semibold"><Icon name="HardHat" className="w-3.5 h-3.5" /> {tramo.ejecutor || 'FIBEX (Interno)'}</span>
                                    </div>
                                </div>
                                <div className="w-full lg:w-64 flex flex-col gap-2 mt-2 lg:mt-0">
                                    <div className="flex justify-between text-sm"><span className="text-slate-600 font-medium">Progreso General</span><span className="text-slate-800 font-bold">{tramo.progress}%</span></div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5"><div className={`h-2.5 rounded-full transition-all duration-500 ${tramo.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${tramo.progress}%` }}></div></div>
                                </div>
                                <div className="hidden lg:flex items-center text-slate-400"><Icon name="ChevronRight" className="w-5 h-5" /></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderDetail = () => {
        if (!selectedTramo) return null;
        const totalPostes = (selectedTramo.postores?.fibex || 0) + (selectedTramo.postores?.edc || 0) + (selectedTramo.postores?.cantv || 0) + (selectedTramo.postores?.otros || 0);

        return (
            <div className="fixed inset-0 bg-slate-900/50 flex justify-end z-50 animate-fade-in">
                <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
                    <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 gap-4">
                        {isEditing ? (
                            <div className="flex-1 space-y-2">
                                <input type="text" name="name" value={editData.name} onChange={handleInputChange} className="w-full text-lg font-bold text-slate-800 bg-white border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                                <div className="flex flex-wrap gap-2 text-sm">
                                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md px-2 py-1"><Icon name="Compass" className="w-4 h-4 text-slate-400" /><input type="text" name="region" value={editData.region} onChange={handleInputChange} className="outline-none w-24 md:w-28 text-slate-700" placeholder="Región" /></div>
                                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md px-2 py-1"><Icon name="MapPin" className="w-4 h-4 text-slate-400" /><input type="text" name="estado" value={editData.estado} onChange={handleInputChange} className="outline-none w-28 md:w-32 text-slate-700" placeholder="Estado(s)" /></div>
                                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md px-2 py-1"><Icon name="Route" className="w-4 h-4 text-slate-400" /><input type="number" name="km" value={editData.km} onChange={handleInputChange} className="outline-none w-16 text-slate-700" placeholder="Km" /><span className="text-slate-500 font-medium">km</span></div>
                                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md px-2 py-1"><Icon name="Layers" className="w-4 h-4 text-slate-400" /><input type="number" name="hilos" value={editData.hilos} onChange={handleInputChange} className="outline-none w-16 text-slate-700" placeholder="Hilos" /><span className="text-slate-500 font-medium">hilos</span></div>
                                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md px-2 py-1 w-full mt-1"><Icon name="HardHat" className="w-4 h-4 text-slate-400" /><input type="text" name="ejecutor" value={editData.ejecutor || ''} onChange={handleInputChange} className="outline-none flex-1 text-slate-700" placeholder="Ejecutor / Contratista" /></div>
                                </div>
                            </div>
                        ) : (
                            <div className="pr-4">
                                <h2 className="text-lg md:text-xl font-bold text-slate-800 leading-tight">{selectedTramo.name}</h2>
                                <div className="text-sm text-slate-500 flex flex-wrap items-center gap-2 mt-1.5">
                                    <span className="flex items-center gap-1"><Icon name="Compass" className="w-4 h-4" /> {selectedTramo.region}</span><span className="hidden sm:inline text-slate-300">•</span>
                                    <span className="flex items-center gap-1"><Icon name="MapPin" className="w-4 h-4" /> {selectedTramo.estado}</span><span className="hidden sm:inline text-slate-300">•</span>
                                    <span className="flex items-center gap-1 font-semibold text-slate-700"><Icon name="Route" className="w-3.5 h-3.5" /> {selectedTramo.km} km</span><span className="hidden sm:inline text-slate-300">•</span>
                                    <span className="flex items-center gap-1 font-semibold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded"><Icon name="Layers" className="w-3.5 h-3.5" /> {selectedTramo.hilos} hilos</span><span className="hidden sm:inline text-slate-300">•</span>
                                    <span className="flex items-center gap-1 font-semibold text-purple-700 bg-purple-100/60 px-1.5 py-0.5 rounded"><Icon name="HardHat" className="w-3.5 h-3.5" /> {selectedTramo.ejecutor || 'FIBEX (Interno)'}</span>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            {isEditing ? (
                                <><button onClick={handleSaveEdit} className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium shadow-sm"><Icon name="Save" className="w-4 h-4" /> <span className="hidden sm:inline">Guardar</span></button><button onClick={handleCancelEdit} className="p-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium shadow-sm"><Icon name="X" className="w-4 h-4" /> <span className="hidden sm:inline">Cancelar</span></button></>
                            ) : (
                                <><button onClick={handleEditClick} className="p-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium shadow-sm"><Icon name="Edit3" className="w-4 h-4" /> <span className="hidden sm:inline">Editar</span></button><button onClick={() => { setSelectedTramo(null); setIsEditing(false); setExpandedHilos(false); }} className="p-2 bg-slate-200/50 hover:bg-slate-200 rounded-full transition-colors flex-shrink-0"><Icon name="X" className="w-5 h-5 text-slate-600" /></button></>
                            )}
                        </div>
                    </div>
                    <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-white">
                        <div className="flex justify-between items-end mb-2"><span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Avance Total</span><span className="text-2xl font-bold text-blue-600">{selectedTramo.progress}%</span></div>
                        <div className="w-full bg-slate-100 rounded-full h-3"><div className={`h-3 rounded-full transition-all duration-500 ${selectedTramo.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${selectedTramo.progress}%` }}></div></div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-center"><p className="text-[11px] font-semibold text-slate-500 uppercase">Mangas</p><p className="text-lg font-bold text-slate-800">{selectedTramo.mangas || 0}</p></div>
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-center"><p className="text-[11px] font-semibold text-slate-500 uppercase">Reservas</p><p className="text-lg font-bold text-slate-800">{selectedTramo.reservas || 0}</p></div>
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-center"><p className="text-[11px] font-semibold text-slate-500 uppercase">Total Postes</p><p className="text-lg font-bold text-blue-600">{totalPostes}</p></div>
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-center"><p className="text-[11px] font-semibold text-slate-500 uppercase">Ejecutor</p><p className="text-xs font-bold text-purple-700 truncate mt-1">{selectedTramo.ejecutor || 'FIBEX'}</p></div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Desglose de Postería por Propietario</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                                <div className="bg-slate-50 p-2 rounded border border-slate-100"><span className="text-slate-500 block">FIBEX</span><span className="font-bold text-slate-800 text-sm">{selectedTramo.postores?.fibex || 0}</span></div>
                                <div className="bg-slate-50 p-2 rounded border border-slate-100"><span className="text-slate-500 block">EDC</span><span className="font-bold text-slate-800 text-sm">{selectedTramo.postores?.edc || 0}</span></div>
                                <div className="bg-slate-50 p-2 rounded border border-slate-100"><span className="text-slate-500 block">CANTV</span><span className="font-bold text-slate-800 text-sm">{selectedTramo.postores?.cantv || 0}</span></div>
                                <div className="bg-slate-50 p-2 rounded border border-slate-100"><span className="text-slate-500 block">Otros</span><span className="font-bold text-slate-800 text-sm">{selectedTramo.postores?.otros || 0}</span></div>
                            </div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                            <div className="mt-0.5 shrink-0"><Icon name="AlertCircle" className="w-5 h-5 text-amber-600" /></div>
                            <div className="w-full"><h4 className="text-sm font-semibold text-amber-800 mb-2">Reporte de Campo Actual</h4>{isEditing ? <textarea name="notes" value={editData.notes} onChange={handleInputChange} rows="3" className="w-full text-sm text-amber-900 bg-white/70 border border-amber-300 rounded-md p-2.5 focus:ring-2 focus:ring-amber-500 outline-none resize-y" /> : <p className="text-sm text-amber-700">{selectedTramo.notes}</p>}</div>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setExpandedHilos(!expandedHilos)}>
                                <div className="flex items-center gap-2"><Icon name="Activity" className="w-5 h-5 text-blue-600" /><div><h3 className="font-semibold text-slate-800 text-sm md:text-base">Mediciones OTDR ({selectedTramo.hilos} Hilos)</h3></div></div>
                                <div className="flex items-center gap-2"><span className="text-xs text-slate-500 font-medium hidden sm:inline">Haz clic para expandir</span><Icon name={expandedHilos ? "ChevronDown" : "ChevronRight"} className="w-5 h-5 text-slate-400" /></div>
                            </div>
                            {expandedHilos && (
                                <div className="p-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-72 overflow-y-auto bg-slate-50/50">
                                    {Array.from({ length: selectedTramo.hilos || 0 }).map((_, i) => {
                                        const hiloVal = selectedTramo.hilos_distancias?.[i + 1];
                                        const targetKm = Number(selectedTramo.km) || 0;
                                        const numVal = Number(hiloVal);
                                        const isFilled = hiloVal !== undefined && hiloVal !== '';
                                        let statusColor = "border-slate-200 bg-white";
                                        if (isFilled) statusColor = (targetKm > 0 && numVal >= targetKm * 0.95) ? "border-emerald-300 bg-emerald-50/60" : "border-amber-300 bg-amber-50/60";
                                        return (
                                            <div key={i} className={`flex flex-col p-2 rounded-lg border shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all ${statusColor}`}>
                                                <label className="text-[10px] font-bold text-slate-500 text-center mb-1">HILO {i + 1}</label>
                                                <div className="flex items-center border-t border-slate-100/80 pt-1 mt-1"><input type="number" step="0.01" className="w-full text-center text-sm font-medium border-0 focus:ring-0 outline-none p-0 text-slate-700 bg-transparent" placeholder="Km" value={hiloVal || ''} onBlur={(e) => handleHiloDistanceChange(selectedTramo.id, i + 1, e.target.value)} onChange={(e) => {
                                                    const updated = {...selectedTramo, hilos_distancias: {...selectedTramo.hilos_distancias, [i+1]: e.target.value}};
                                                    setSelectedTramo(updated);
                                                }} /></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="space-y-6 pb-8">
                            {Object.keys(phaseConfig).map((faseKey) => {
                                const config = phaseConfig[faseKey];
                                const tasks = selectedTramo.fases[faseKey];
                                const phaseTasks = Object.keys(tasks);
                                const isPhaseComplete = phaseTasks.filter(k => tasks[k]).length === phaseTasks.length;
                                return (
                                    <div key={faseKey} className="border border-slate-200 rounded-xl overflow-hidden">
                                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2"><Icon name={config.iconName} className={config.iconClass} /><h3 className="font-semibold text-slate-800 text-sm md:text-base">{config.title}</h3></div>
                                            {isPhaseComplete && <span className="w-max flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full"><Icon name="CheckCircle" className="w-3 h-3" /> Completada</span>}
                                        </div>
                                        <div className="divide-y divide-slate-100 bg-white">
                                            {config.tasks.map((task) => {
                                                const taskAttachments = selectedTramo.attachments?.[faseKey]?.[task.id] || [];
                                                return (
                                                <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors space-y-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="pt-0.5 flex-shrink-0"><input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-600 cursor-pointer" checked={tasks[task.id]} onChange={() => toggleTask(selectedTramo.id, faseKey, task.id)} /></div>
                                                        <div className="flex-1 cursor-pointer" onClick={() => toggleTask(selectedTramo.id, faseKey, task.id)}><p className={`text-sm font-medium ${tasks[task.id] ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.label}</p></div>
                                                    </div>
                                                    {taskAttachments.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 pl-8">
                                                            {taskAttachments.map((att) => (
                                                                <div key={att.id} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-xs shadow-sm">
                                                                    <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline text-blue-700"><Icon name="ExternalLink" className="w-3.5 h-3.5 flex-shrink-0" /><span className="max-w-[140px] truncate font-medium">{att.name}</span></a>
                                                                    <button onClick={() => handleRemoveFile(selectedTramo.id, faseKey, task.id, att)} className="text-blue-400 hover:text-red-500 transition-colors ml-1 p-0.5 hover:bg-blue-100 rounded"><Icon name="X" className="w-3.5 h-3.5" /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="pl-8 pt-1">
                                                        <label className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white border rounded-lg transition-all shadow-sm ${isUploading ? 'text-slate-400 border-slate-200 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600 cursor-pointer border-slate-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                                                            {isUploading ? <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-400"></div><span>Subiendo...</span></> : <><Icon name="Upload" className="w-4 h-4" /><span>Adjuntar Archivo(s)</span><input type="file" multiple className="hidden" disabled={isUploading} onChange={(e) => handleFileUpload(selectedTramo.id, faseKey, task.id, e)} /></>}
                                                        </label>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderCreatePanel = () => {
        if (!isCreating) return null;
        return (
            <div className="fixed inset-0 bg-slate-900/50 flex justify-end z-50 animate-fade-in">
                <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50"><h2 className="text-xl font-bold text-slate-800">Registrar Troncal</h2><button onClick={() => setIsCreating(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><Icon name="X" className="w-5 h-5 text-slate-600" /></button></div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Tramo *</label><input type="text" name="name" value={newTramo.name} onChange={handleCreateChange} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Región</label><input type="text" name="region" value={newTramo.region} onChange={handleCreateChange} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Estado</label><input type="text" name="estado" value={newTramo.estado} onChange={handleCreateChange} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" /></div></div>
                        <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Kilómetros (Km)</label><input type="number" name="km" value={newTramo.km} onChange={handleCreateChange} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Hilos</label><input type="number" name="hilos" value={newTramo.hilos} onChange={handleCreateChange} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" /></div></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Mangas Existentes</label><input type="number" name="mangas" value={newTramo.mangas} onChange={handleCreateChange} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />{newTramo.km > 0 && <p className={`text-[11px] mt-1 ${validateMangasLimit(newTramo.km, newTramo.mangas).excede ? 'text-red-600 font-bold' : 'text-slate-500'}`}>Máx: {validateMangasLimit(newTramo.km, newTramo.mangas).maxPermitidas} (3/km)</p>}</div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Reservas de Fibra</label><input type="number" name="reservas" value={newTramo.reservas} onChange={handleCreateChange} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        </div>
                        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><Icon name="Layers" className="w-4 h-4 text-slate-500" /> Censo de Postería</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-medium text-slate-600 mb-1">Postes FIBEX</label><input type="number" name="postFibex" value={newTramo.postFibex} onChange={handleCreateChange} className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                <div><label className="block text-xs font-medium text-slate-600 mb-1">Postes EDC</label><input type="number" name="postEdc" value={newTramo.postEdc} onChange={handleCreateChange} className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                <div><label className="block text-xs font-medium text-slate-600 mb-1">Postes CANTV</label><input type="number" name="postCantv" value={newTramo.postCantv} onChange={handleCreateChange} className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                <div><label className="block text-xs font-medium text-slate-600 mb-1">Postes Otros</label><input type="number" name="postOtros" value={newTramo.postOtros} onChange={handleCreateChange} className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                            </div>
                        </div>
                        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><Icon name="Users" className="w-4 h-4 text-slate-500" /> Asignación de Ejecutor</h3>
                            <div className="space-y-3">
                                <select name="ejecutorType" value={newTramo.ejecutorType} onChange={handleCreateChange} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="FIBEX">Personal Interno (FIBEX)</option><option value="CONTRATISTA">Contratista Externa</option></select>
                                {newTramo.ejecutorType === 'CONTRATISTA' && (<div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Contratista *</label><input type="text" name="contratistaName" value={newTramo.contratistaName} onChange={handleCreateChange} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" /></div>)}
                            </div>
                        </div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Notas Iniciales</label><textarea name="notes" value={newTramo.notes} onChange={handleCreateChange} rows="4" className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-y" /></div>
                    </div>
                    <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3"><button onClick={() => setIsCreating(false)} className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancelar</button><button onClick={handleCreateSubmit} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"><Icon name="Save" className="w-4 h-4" /> Crear Troncal</button></div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans relative">
            <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-lg"><Icon name="Wrench" className="w-5 h-5 md:w-6 md:h-6 text-white" /></div>
                            <span className="font-bold text-lg md:text-xl tracking-wide">FIBEX <span className="text-blue-400">O&M</span></span>
                        </div>
                        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                            <a href="#" className="text-white hover:text-blue-400 transition-colors flex items-center gap-2"><Icon name="Map" className="w-4 h-4" /> Tramos</a>
                            <a href="#" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"><Icon name="Users" className="w-4 h-4" /> Contratistas</a>
                            <a href="#" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"><Icon name="FileText" className="w-4 h-4" /> Reportes KMZ</a>
                            <button onClick={async () => await supabase.auth.signOut()} className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 ml-4"><Icon name="LogOut" className="w-4 h-4" /> Salir</button>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto pb-10">{renderDashboard()}</main>
            {renderDetail()}
            {renderCreatePanel()}
            {toast && (
                <div className={`fixed bottom-4 right-4 md:bottom-8 md:right-8 px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 z-[60] transition-all transform duration-300 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}>
                    <Icon name={toast.type === 'error' ? 'AlertCircle' : 'CheckCircle'} className="w-5 h-5" />
                    <p className="text-sm font-medium pr-2">{toast.message}</p>
                </div>
            )}
        </div>
    );
}
