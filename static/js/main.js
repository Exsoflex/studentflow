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
    const vistaValendario = document.getElementById('vista-calendario');
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
// MOTOR DEL CALENDARIO VISUAL
// =============================================================
let fechaActual = new Date(); // Guarda el año y mes en el que estamos navegando

const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function renderizarCalendario() {
    const mesTexto = document.getElementById('mes-ano-texto');
    const diasGrid = document.getElementById('dias-grid');

    if (!mesTexto || !diasGrid) return;

    const ano = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();

    // 1. Ponemos el titulo
    mesTexto.innerText = `${mesesNombres[mes]} ${ano}`;

    // 2. Limpiar la cuadricula
    diasGrid.innerText = '';

    // 3. Averiguamos que dia de la semana empieza el mes (0=Dom, 6=Sab)
    const primerDiaIndex = new Date(ano, mes, 1).getDay();

    // 4. Calculammos cuantos dias tiene el mes
    const totalDiasMes = new Date(ano, mes + 1, 0).getDate();

    // 5. Dibujamos celdas vacias para los dias antes de que empiece el mes
    for (let i = 0; i < diaInicio; i++) {
        const celdaVacia = document.createElement('div');
        celdaVacia.classList.add('day-cell', 'empty');
        diasGrid.appendChild(celdaVacia);
    }

    // 6. Dibujamos los dias reales del mes
    const hoy = new Date();
    for (let dia = 1; dia <= totalDiasMes; dia++) {
        const celdaDia = document.createElement('div');
        celdaDia.classList.add('day-cell');
        celdaDia.innerText = dia;

        // Si el dia es hoy, se destaca
        if (dia === hoy.getDate() && mes == hoy.getMonth() && ano === hoy.getFullYear()) {
            celdaDia.classList.add('today');
        }

        // Evento al hacer clic en un dia (por ahora solo mensaje visual)
        celdaDia.addEventListener('click', () => {
            alert(`Seleccionaste el dia ${dia} de ${mesNombres[mes]} de ${ano}`);
        });

        diasGrid.appendChild(celdaDia);
    }
}

// Botones para avanzar o retroceder de mes
document.getElementById('btn-prev-mes')?.addEventListener('click', () => {
    fechaActual.setMonth(fechaActual.getMonth() - 1);
    renderizarCalendario();
});

document.getElementById('btn-next-mes')?.addEventListener('click', () => {
    fechaActual.setMonth(fechaActual.getMonth() + 1);
    renderizarCalendario();
});
