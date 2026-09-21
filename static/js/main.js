// URL base del servidor Backend
const API_URL = 'http://localhost:5000/api/notas';

// Referencias a elementos del DOM (Pantalla)
const formNota = document.getElementById('form-nota');
const inputTitulo = document.getElementById('titulo');
const inputContenido = document.getElementById('contenido')
const contenedorNotas = document.getElementById('contenedor-notas');

// ----------------------------------------------------------
// 1. Cargar y mostrar todas las notas al abrir la pagina
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    cargarNotas();
})

async function cargarNotas() {
    try {
        const respuesta = await fetch(API_URL);
        const notas = await respuesta.json();

        // Limpiamos el contenedor
        contenedorNotas.innerHTML = '';

        if (notas.length === 0) {
            contenedorNotas.innerHTML = '<p style="color:#64748b;">No tienes notas creadas aun. Crea una nueva nota a la izquierda!</p>';
            return;
        }
        
        // Dibujamos cada nota en la pantalla
        notas.forEach(nota => {
            const notaElemento = document.createElement('div');
            notaElemento.classList.add('note-card');

            // Formateamos la fecha
            const fecha = new 
            Date(nota.fecha_creacion).toLocaleDateString('es-Es', {
                day: 'numeric', month: 'short', year: 'numeric'
            });

            notaElemento.innerHTML = `
                <div>
                    <h3>${escaparHTML(nota.titulo)}</h3>
                    <p>${escaparHTML(nota.contenido || 'Sin contenido')}</p>
                </div>
                <div class="note-footer">
                    <span class="note-date">${fecha}</span>
                    <button class="btn-delete" onclick="eliminarNota(${nota.id})">🗑️ Borrar</button>
                </div>
            `;

            contenedorNotas.appendChild(notaElemento);
        });
    } catch (error) {
        console.error('Error al cargar notas:', error);
    } 
}

// ----------------------------------------------------------
// 2. Guardar una nueva nota (Formulario Submit)
// ----------------------------------------------------------
formNota.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la pagina se recargue

    const nuevaNota = {
        titulo: inputTitulo.value,
        contenido: inputContenido.value
    };

    try {
        const respuesta = await fetch(API_URL, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaNota)
        });

        if (respuesta.ok) {
            // Limpiar los campos del formulario
            inputTitulo.value = '';
            inputContenido.value = '';

            // Recarga la lista de notas para ver la nueva
            cargarNotas();
        } else {
            alert('Error al guardar la nota');
        }
    } catch (error) {
        console.error('Error al guardar nota:', error);
    }
});

// -------------------------------------------------------------
// 3. Eliminar una nota por su ID
// -------------------------------------------------------------
async function eliminarNota(id) {
    if (!confirm('Estas seguro que deseas eliminar esta nota?')) 
        return;

    try {
        const respuesta = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            cargarNotas(); // Recargamos las notas restantes
        } else {
            alert('Error al eliminar la nota');
        }   
    } catch (error) {
            console.error('Error al eliminar la nota:', error);
    }
}

// Funcion auxiliar para evitar ataques de Inyeccion HTML (Seguridad)
function escaparHTML(texto) {
    const div = document.createElement('div');
    div.innerText = texto;
    return div.innerHTML;
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
    } else {
        vistaNotas.classList.remove('active');
        vistaCalendario.classList.add('active');
        tabNotas.classList.remove('active');
        tabCalendario.classList.add('active');
        renderizarCalendario(); // Dibujamos el calendario al cambiar de pestana
    }
}

// =============================================================
// MOTOR DEL CALENDARIO VISUAL Y EVENTOS
// =============================================================
const API_EVENTOS_URL = 'http://localhost:5000/api/eventos';
let fechaActual = new Date();
let listaEventos = []; // Guardará los eventos traídos de MySQL

const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Cargar eventos desde el backend
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

    mesTexto.innerText = `${mesesNombres[mes]} ${ano}`;
    diasGrid.innerHTML = '';

    const primerDiaIndex = new Date(ano, mes, 1).getDay(); // 0 = Domingo
    const totalDiasMes = new Date(ano, mes + 1, 0).getDate();

    // Días vacíos previos
    for (let i = 0; i < primerDiaIndex; i++) {
        const celdaVacia = document.createElement('div');
        celdaVacia.classList.add('day-cell', 'empty');
        diasGrid.appendChild(celdaVacia);
    }

    // Días reales
    const hoy = new Date();
    for (let dia = 1; dia <= totalDiasMes; dia++) {
        const celdaDia = document.createElement('div');
        celdaDia.classList.add('day-cell');

        // Formato de fecha YYYY-MM-DD
        const mesFormateado = String(mes + 1).padStart(2, '0');
        const diaFormateado = String(dia).padStart(2, '0');
        const fechaStr = `${ano}-${mesFormateado}-${diaFormateado}`;

        // Número del día
        celdaDia.innerHTML = `<span>${dia}</span>`;

        if (dia === hoy.getDate() && mes === hoy.getMonth() && ano === hoy.getFullYear()) {
            celdaDia.classList.add('today');
        }

        // Buscar si hay eventos en esta fecha y pintarlos
        const eventosDelDia = listaEventos.filter(e => e.fecha_evento === fechaStr);
        eventosDelDia.forEach(evento => {
            const badge = document.createElement('div');
            badge.classList.add('event-badge');
            badge.innerText = evento.titulo;
            celdaDia.appendChild(badge);
        });

        // Al hacer clic, abre la ventana flotante de este día
        celdaDia.addEventListener('click', () => abrirModal(fechaStr, eventosDelDia));

        diasGrid.appendChild(celdaDia);
    }
}

// Navegación de meses
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
                <button class="btn-delete" onclick="eliminarEvento(${ev.id})">✕</button>
            `;
            listaEventosDia.appendChild(item);
        });
    }

    modal.classList.add('active');
}

function cerrarModal() {
    modal.classList.remove('active');
}

// Guardar nuevo evento
formEvento?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevoEvento = {
        titulo: eventoTituloInput.value,
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
            cargarEventos(); // Recarga y actualiza el calendario
        }
    } catch (error) {
        console.error('Error al guardar evento:', error);
    }
});

// Eliminar evento
async function eliminarEvento(id) {
    try {
        const res = await fetch(`${API_EVENTOS_URL}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            cerrarModal();
            cargarEventos();
        }
    } catch (error) {
        console.error('Error al eliminar evento:', error);
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