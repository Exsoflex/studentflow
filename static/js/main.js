// URL base del servidor Backend
const API_URL = 'http://localhost:5000/api/notas';

// Referencias a elementos del DOM - Nueva UI Inline
const inlineTitulo = document.getElementById('inline-titulo');
const inlineContenido = document.getElementById('inline-contenido');
const btnGuardarNota = document.getElementById('btn-guardar-nota');
const btnAddChecklist = document.getElementById('btn-add-checklist');
const inlineChecklistContainer = document.getElementById('inline-checklist-container');
const contenedorNotas = document.getElementById('contenedor-notas');

// Modal confirmación personalizado
const modalConfirmar = document.getElementById('modal-confirmar');
const confirmTitulo = document.getElementById('confirm-titulo');
const confirmMensaje = document.getElementById('confirm-mensaje');
const confirmAccion = document.getElementById('confirm-accion');

let confirmCallback = null;
let notaEliminandoId = null;

// ----------------------------------------------------------
// 1. Cargar y mostrar todas las notas al abrir la pagina
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    cargarNotas();
    initInlineNoteCapture();
    initGlobalShortcuts();
})

async function cargarNotas() {
    try {
        const respuesta = await fetch(API_URL);
        const notas = await respuesta.json();

        contenedorNotas.innerHTML = '';

        if (notas.length === 0) {
            return;
        }
        
        // API returns newest first (DESC), so we render in order
        notas.forEach(nota => {
            renderNoteCard(nota);
        });
    } catch (error) {
        console.error('Error al cargar notas:', error);
    } 
}

// ----------------------------------------------------------
// Global Shortcuts & Helpers
// ----------------------------------------------------------
function initGlobalShortcuts() {
    // Cerrar modales con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cerrarModal();
            cerrarConfirmModal();
        }
    });

    // Click fuera del modal para cerrar
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                if (overlay.id === 'modal-evento') cerrarModal();
                if (overlay.id === 'modal-confirmar') cerrarConfirmModal();
            }
        });
    });
}

// ----------------------------------------------------------
// Inline Note Capture - Estilo Notion/Google Keep
// ----------------------------------------------------------
function initInlineNoteCapture() {
    // Guardar nota - Click
    btnGuardarNota.addEventListener('click', guardarNotaInline);

    // Guardar nota - Ctrl+Enter desde cualquier campo del formulario inline
    [inlineTitulo, inlineContenido].forEach(el => {
        el.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                guardarNotaInline();
            }
        });
    });

    // Enter en título -> foco en contenido
    inlineTitulo.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            inlineContenido.focus();
        }
    });

    // Enter en contenido -> mostrar checklist y foco en primer input, o guardar si ya hay checklist
    inlineContenido.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            
            // Si no hay checklist visible, mostrarlo y crear primer item
            if (inlineChecklistContainer.classList.contains('hidden')) {
                inlineChecklistContainer.classList.remove('hidden');
                const firstRow = addChecklistInputRow(inlineChecklistContainer);
                firstRow.querySelector('input[type="text"]').focus();
                btnAddChecklist.style.display = 'none';
            } else {
                // Ya hay checklist visible, foco al primer input de texto vacío o crear nuevo
                const textInputs = inlineChecklistContainer.querySelectorAll('input[type="text"].checklist-item-input');
                let focused = false;
                for (const input of textInputs) {
                    if (!input.value.trim()) {
                        input.focus();
                        focused = true;
                        break;
                    }
                }
                if (!focused) {
                    // Todos tienen texto, crear nuevo
                    const newRow = addChecklistInputRow(inlineChecklistContainer);
                    newRow.querySelector('input[type="text"]').focus();
                }
            }
        }
    });

    // Agregar campo de checklist en la nota inline (botón ☑)
    btnAddChecklist.addEventListener('click', () => {
        inlineChecklistContainer.classList.remove('hidden');
        const firstRow = addChecklistInputRow(inlineChecklistContainer);
        firstRow.querySelector('input[type="text"]').focus();
        btnAddChecklist.style.display = 'none';
    });

    // Focus inicial
    inlineTitulo.focus();
}

async function guardarNotaInline() {
    const titulo = inlineTitulo.value.trim();
    const contenido = inlineContenido.value.trim();
    
    if (!titulo && !contenido) {
        shakeElement(document.getElementById('nueva-nota-inline'));
        return;
    }

    // Deshabilitar botón mientras guarda
    btnGuardarNota.disabled = true;
    btnGuardarNota.textContent = 'Guardando...';

    try {
        const respuesta = await fetch(API_URL, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, contenido })
        });

        if (respuesta.ok) {
            const data = await respuesta.json();
            
            // Add checklist items if any were added before saving
            const checklistInputs = inlineChecklistContainer.querySelectorAll('.checklist-item-input[type="text"]');
            for (const input of checklistInputs) {
                const texto = input.value.trim();
                if (texto) {
                    await agregarChecklistItemAPI(data.id, texto);
                }
            }
            
            cargarNotas();
            resetInlineForm();
        } else {
            showToast('Error al guardar la nota');
        }
    } catch (error) {
        console.error('Error al guardar nota:', error);
        showToast('Error de conexión');
    } finally {
        btnGuardarNota.disabled = false;
        btnGuardarNota.textContent = 'Guardar (Ctrl+Enter)';
    }
}

function resetInlineForm() {
    inlineTitulo.value = '';
    inlineContenido.value = '';
    inlineChecklistContainer.innerHTML = '';
    inlineChecklistContainer.classList.add('hidden');
    btnAddChecklist.style.display = 'flex';
    btnGuardarNota.disabled = false;
    btnGuardarNota.textContent = 'Guardar (Ctrl+Enter)';
    inlineTitulo.focus();
}

function addChecklistInputRow(container, texto = '', completado = false, itemId = null, isSavedNote = false) {
    const row = document.createElement('div');
    row.className = 'checklist-item-input-row';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '0.5rem';
    row.style.marginBottom = '0.4rem';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checklist-item-input';
    checkbox.checked = completado;
    checkbox.style.width = '1.1rem';
    checkbox.style.height = '1.1rem';
    checkbox.style.accentColor = 'var(--primary-color)';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'checklist-item-input';
    input.value = texto;
    input.placeholder = 'Elemento de la lista...';
    input.style.flex = '1';
    input.style.padding = '0.4rem 0.5rem';
    input.style.border = '1px solid var(--border-color)';
    input.style.borderRadius = '8px';
    input.style.fontSize = '0.9rem';
    input.style.outline = 'none';
    input.style.background = 'var(--card-bg)';
    
    // Enter en input de checklist -> crear nuevo item
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const currentText = input.value.trim();
            if (currentText) {
                // Crear siguiente input
                const nextRow = addChecklistInputRow(container);
                nextRow.querySelector('input[type="text"]').focus();
            }
        }
        // Ctrl+Enter para guardar la nota desde checklist
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            guardarNotaInline();
        }
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.innerHTML = '✕';
    deleteBtn.style.background = 'transparent';
    deleteBtn.style.border = 'none';
    deleteBtn.style.color = 'var(--text-muted)';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.padding = '0.25rem 0.5rem';
    deleteBtn.style.borderRadius = '6px';
    deleteBtn.style.fontSize = '0.8rem';
    deleteBtn.onclick = () => {
        row.style.animation = 'checklistIn 0.2s ease reverse';
        setTimeout(() => row.remove(), 200);
    };
    
    row.appendChild(checkbox);
    row.appendChild(input);
    row.appendChild(deleteBtn);
    container.appendChild(row);
    input.focus();
    
    return row;
}

// ----------------------------------------------------------
// 2. Render Note Card con Checklist
// ----------------------------------------------------------
function renderNoteCard(nota) {
    const notaElemento = document.createElement('div');
    notaElemento.classList.add('note-card');
    notaElemento.dataset.id = nota.id;

    const fecha = new Date(nota.fecha_creacion).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', year: 'numeric'
    });

    let checklistHTML = '';
    if (nota.checklist && nota.checklist.length > 0) {
        checklistHTML = `
            <div class="checklist-container" data-nota-id="${nota.id}">
                ${nota.checklist.map(item => `
                    <div class="checklist-item ${item.completado ? 'completed' : ''}" data-item-id="${item.id}">
                        <input type="checkbox" ${item.completado ? 'checked' : ''} onchange="toggleChecklistItem(${item.id}, this)">
                        <span class="checklist-text">${escaparHTML(item.texto)}</span>
                        <button class="btn-delete-checklist" onclick="confirmarEliminarChecklist(${item.id}, this)">✕</button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Add "add item" row at the end of checklist for saved notes (always show for notes with or without checklist)
    const addItemRow = `
        <div class="checklist-add-row" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color);">
            <span style="width: 1.1rem;"></span>
            <input type="text" class="checklist-new-item" placeholder="Añadir elemento... (Enter para guardar)" 
                   style="flex: 1; padding: 0.4rem 0.5rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.9rem; outline: none; background: var(--card-bg);"
                   data-nota-id="${nota.id}">
        </div>
    `;

    notaElemento.innerHTML = `
        <div>
            <h3>${escaparHTML(nota.titulo)}</h3>
            <p>${escaparHTML(nota.contenido || '')}</p>
            ${checklistHTML}
            ${addItemRow}
        </div>
        <div class="note-footer">
            <span class="note-date">${fecha}</span>
            <button class="btn-delete" onclick="confirmarEliminarNota(${nota.id})">Eliminar</button>
        </div>
    `;

    // Insert at the top (newest first) - insertBefore with firstChild puts it at position 0
    contenedorNotas.insertBefore(notaElemento, contenedorNotas.firstChild);

    // Setup enter key for new checklist item in saved note
    const newItemInput = notaElemento.querySelector('.checklist-new-item');
    if (newItemInput) {
        newItemInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const texto = newItemInput.value.trim();
                if (texto) {
                    const notaId = parseInt(newItemInput.dataset.notaId);
                    const result = await agregarChecklistItemAPI(notaId, texto);
                    if (result) {
                        newItemInput.value = '';
                        // Add to UI immediately
                        const container = notaElemento.querySelector('.checklist-container');
                        const newItem = document.createElement('div');
                        newItem.className = 'checklist-item';
                        newItem.dataset.itemId = result.id;
                        newItem.innerHTML = `
                            <input type="checkbox" onchange="toggleChecklistItem(${result.id}, this)">
                            <span class="checklist-text">${escaparHTML(result.texto)}</span>
                            <button class="btn-delete-checklist" onclick="confirmarEliminarChecklist(${result.id}, this)">✕</button>
                        `;
                        container.insertBefore(newItem, newItemInput.parentElement);
                    }
                }
            }
        });
    }
}

// ----------------------------------------------------------
// 3. Eliminar nota con confirmación personalizada
// ----------------------------------------------------------
function confirmarEliminarNota(id) {
    notaEliminandoId = id;
    confirmTitulo.textContent = 'Eliminar nota';
    confirmMensaje.textContent = '¿Estás seguro de que quieres eliminar esta nota? Esta acción no se puede deshacer.';
    confirmAccion.textContent = 'Eliminar';
    confirmAccion.onclick = () => eliminarNotaConfirmada();
    modalConfirmar.classList.add('active');
}

async function eliminarNotaConfirmada() {
    if (!notaEliminandoId) return;
    
    const card = document.querySelector(`.note-card[data-id="${notaEliminandoId}"]`);
    if (card) {
        card.classList.add('removing');
        await new Promise(r => setTimeout(r, 250));
    }

    try {
        const respuesta = await fetch(`${API_URL}/${notaEliminandoId}`, { method: 'DELETE' });
        if (respuesta.ok) {
            cargarNotas();
            showToast('Nota eliminada');
        } else {
            showToast('Error al eliminar la nota');
            if (card) card.classList.remove('removing');
        }
    } catch (error) {
        console.error('Error al eliminar la nota:', error);
        showToast('Error de conexión');
        if (card) card.classList.remove('removing');
    } finally {
        cerrarConfirmModal();
        notaEliminandoId = null;
    }
}

function cerrarConfirmModal() {
    modalConfirmar.classList.remove('active');
    confirmCallback = null;
    notaEliminandoId = null;
}

// ----------------------------------------------------------
// 4. Eliminar checklist item con confirmación
// ----------------------------------------------------------
function confirmarEliminarChecklist(itemId, btn) {
    confirmTitulo.textContent = 'Eliminar elemento';
    confirmMensaje.textContent = '¿Eliminar este elemento de la lista?';
    confirmAccion.textContent = 'Eliminar';
    confirmAccion.onclick = () => eliminarChecklistItemConfirmado(itemId, btn);
    modalConfirmar.classList.add('active');
}

async function eliminarChecklistItemConfirmado(itemId, btn) {
    try {
        const res = await fetch(`${API_URL.replace('/notas', '')}/items/${itemId}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            const item = btn.closest('.checklist-item');
            item.style.animation = 'checklistIn 0.2s ease reverse';
            setTimeout(() => item.remove(), 200);
            showToast('Elemento eliminado');
        }
    } catch (error) {
        console.error('Error al eliminar item:', error);
        showToast('Error al eliminar');
    } finally {
        cerrarConfirmModal();
    }
}

// ----------------------------------------------------------
// 5. Checklist API Functions
// ----------------------------------------------------------
async function agregarChecklistItemAPI(notaId, texto) {
    try {
        const res = await fetch(`${API_URL}/${notaId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto })
        });
        return res.ok ? await res.json() : null;
    } catch (e) {
        console.error('Error adding checklist item:', e);
        return null;
    }
}

async function toggleChecklistItem(itemId, checkbox) {
    try {
        const res = await fetch(`${API_URL.replace('/notas', '')}/items/${itemId}/toggle`, {
            method: 'PUT'
        });
        if (res.ok) {
            const data = await res.json();
            const item = checkbox.closest('.checklist-item');
            if (data.completado) {
                item.classList.add('completed');
            } else {
                item.classList.remove('completed');
            }
        }
    } catch (error) {
        console.error('Error al actualizar item:', error);
        checkbox.checked = !checkbox.checked;
    }
}

// Funcion auxiliar para evitar ataques de Inyeccion HTML (Seguridad)
function escaparHTML(texto) {
    const div = document.createElement('div');
    div.innerText = texto;
    return div.innerHTML;
}

// Toast notifications
function showToast(mensaje) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = mensaje;
    toast.style.cssText = `
        position: fixed;
        bottom: 1.5rem;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: var(--text-color);
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        z-index: 2000;
        opacity: 0;
        transition: all 0.3s ease;
        box-shadow: var(--shadow-lg);
    `;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
    });
    
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function shakeElement(el) {
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 300);
}

// =============================================================
// CONTROL DE PESTAÑAS (Tabs)
// =============================================================
function cambiarPestana(modulo) {
    const vistaNotas = document.getElementById('vista-notas');
    const vistaCalendario = document.getElementById('vista-calendario');
    const tabNotas = document.getElementById('tab-notas');
    const tabCalendario = document.getElementById('tab-calendario');

    if (modulo === 'notas') {
        vistaNotas.classList.add('active');
        vistaCalendario.classList.remove('active');
        tabNotas.classList.add('active');
        tabCalendario.classList.remove('active');
        // Refocus title input when switching to notes
        setTimeout(() => inlineTitulo.focus(), 100);
    } else {
        vistaNotas.classList.remove('active');
        vistaCalendario.classList.add('active');
        tabNotas.classList.remove('active');
        tabCalendario.classList.add('active');
        renderizarCalendario();
    }
}

// =============================================================
// MOTOR DEL CALENDARIO VISUAL Y EVENTOS
// =============================================================
const API_EVENTOS_URL = 'http://localhost:5000/api/eventos';
let fechaActual = new Date();
let listaEventos = [];

const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

async function cargarEventos() {
    try {
        const respuesta = await fetch(API_EVENTOS_URL);
        listaEventos = await respuesta.json();
        renderizarCalendario();
    } catch (error) {
        console.error('Error al cargar eventos:', error);
    }
}

function renderizarCalendario() {
    const mesTexto = document.getElementById('mes-ano-texto');
    const diasGrid = document.getElementById('dias-grid');

    if (!mesTexto || !diasGrid) return;

    const ano = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();

    mesTexto.innerText = `${mesNombres[mes]} ${ano}`;
    diasGrid.innerHTML = '';

    const primerDiaIndex = new Date(ano, mes, 1).getDay();
    const totalDiasMes = new Date(ano, mes + 1, 0).getDate();

    for (let i = 0; i < primerDiaIndex; i++) {
        const celdaVacia = document.createElement('div');
        celdaVacia.classList.add('day-cell', 'empty');
        diasGrid.appendChild(celdaVacia);
    }

    const hoy = new Date();
    for (let dia = 1; dia <= totalDiasMes; dia++) {
        const celdaDia = document.createElement('div');
        celdaDia.classList.add('day-cell');
        celdaDia.tabIndex = 0; // Para accesibilidad con teclado

        const mesFormateado = String(mes + 1).padStart(2, '0');
        const diaFormateado = String(dia).padStart(2, '0');
        const fechaStr = `${ano}-${mesFormateado}-${diaFormateado}`;

        celdaDia.innerHTML = `<span>${dia}</span>`;

        if (dia === hoy.getDate() && mes === hoy.getMonth() && ano === hoy.getFullYear()) {
            celdaDia.classList.add('today');
        }

        const eventosDelDia = listaEventos.filter(e => e.fecha_evento === fechaStr);
        eventosDelDia.forEach(evento => {
            const badge = document.createElement('div');
            badge.classList.add('event-badge');
            badge.innerText = evento.titulo;
            celdaDia.appendChild(badge);
        });

        // Click y Enter para abrir modal
        const abrir = () => abrirModal(fechaStr, eventosDelDia);
        celdaDia.addEventListener('click', abrir);
        celdaDia.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                abrir();
            }
        });

        diasGrid.appendChild(celdaDia);
    }
}

document.getElementById('btn-prev-mes')?.addEventListener('click', () => {
    fechaActual.setMonth(fechaActual.getMonth() - 1);
    renderizarCalendario();
});

document.getElementById('btn-next-mes')?.addEventListener('click', () => {
    fechaActual.setMonth(fechaActual.getMonth() + 1);
    renderizarCalendario();
});

// =============================================================
// MODAL DE EVENTOS
// =============================================================
const modal = document.getElementById('modal-evento');
const modalFechaTitulo = document.getElementById('modal-fecha-titulo');
const listaEventosDia = document.getElementById('lista-eventos-dia');
const eventoFechaInput = document.getElementById('evento-fecha-input');
const eventoTituloInput = document.getElementById('evento-titulo-input');
const formEvento = document.getElementById('form-evento');

function abrirModal(fechaStr, eventos) {
    modalFechaTitulo.innerText = `Eventos: ${fechaStr}`;
    eventoFechaInput.value = fechaStr;
    eventoTituloInput.value = '';
    
    listaEventosDia.innerHTML = '';
    if (eventos.length === 0) {
        listaEventosDia.innerHTML = '<p style="color:#64748b; font-size:0.85rem;">No hay eventos para este día.</p>';
    } else {
        eventos.forEach(ev => {
            const item = document.createElement('div');
            item.classList.add('event-item');
            item.innerHTML = `
                <span>📌 ${escaparHTML(ev.titulo)}</span>
                <button class="btn-delete" onclick="confirmarEliminarEvento(${ev.id})">✕</button>
            `;
            listaEventosDia.appendChild(item);
        });
    }

    modal.classList.add('active');
    setTimeout(() => eventoTituloInput.focus(), 100);
}

function cerrarModal() {
    modal.classList.remove('active');
}

formEvento?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = eventoTituloInput.value.trim();
    if (!titulo) return;
    
    const nuevoEvento = {
        titulo,
        fecha_evento: eventoFechaInput.value
    };

    try {
        const res = await fetch(API_EVENTOS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoEvento)
        });

        if (res.ok) {
            cerrarModal();
            cargarEventos();
            showToast('Evento guardado');
        }
    } catch (error) {
        console.error('Error al guardar evento:', error);
        showToast('Error al guardar');
    }
});

function confirmarEliminarEvento(id) {
    confirmTitulo.textContent = 'Eliminar evento';
    confirmMensaje.textContent = '¿Eliminar este evento?';
    confirmAccion.textContent = 'Eliminar';
    confirmAccion.onclick = () => eliminarEventoConfirmado(id);
    modalConfirmar.classList.add('active');
}

async function eliminarEventoConfirmado(id) {
    try {
        const res = await fetch(`${API_EVENTOS_URL}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            cerrarModal();
            cargarEventos();
            showToast('Evento eliminado');
        }
    } catch (error) {
        console.error('Error al eliminar evento:', error);
        showToast('Error al eliminar');
    } finally {
        cerrarConfirmModal();
    }
}

// Asegurarse de que al cambiar a la pestaña de calendario cargue los eventos
const funcionOriginalCambiarPestana = cambiarPestana;
cambiarPestana = function(modulo) {
    funcionOriginalCambiarPestana(modulo);
    if (modulo === 'calendario') {
        cargarEventos();
    }
};