// Módulo para mostrar historial de asistencias en tarjetas
(function () {
    const container = document.querySelector('#historial .historial-list');
    if (!container) return;
    const anioSelect = document.getElementById('hist-filter-anio');
    const divisionSelect = document.getElementById('hist-filter-division');
    const fechaInput = document.getElementById('hist-filter-fecha');
    const turnoSelect = document.getElementById('hist-filter-turno');
    const filterBtn = document.getElementById('hist-filter-btn');
    const clearBtn = document.getElementById('hist-clear-btn');

    function formatDate(d) {
        if (!d) return '';
        // si viene con 'T' (ISO), tomar la parte de fecha o parsear
        try {
            const date = new Date(d);
            if (!isNaN(date.getTime())) {
                const dd = String(date.getDate()).padStart(2, '0');
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const yyyy = date.getFullYear();
                return `${dd}/${mm}/${yyyy}`;
            }
        } catch (e) {
            // fallthrough
        }
        // fallback si ya viene en formato yyyy-mm-dd
        const short = String(d).split('T')[0];
        const parts = short.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return String(d);
    }

    function createCard(session) {
        const card = document.createElement('div');
        card.className = 'historial-card';

        const courseHeader = document.createElement('div');
        courseHeader.className = 'course-header';
        const title = document.createElement('div');
        title.className = 'course-title';
        title.textContent = `Curso: ${session.anio}° Año - División ${session.division}`;
        const fecha = document.createElement('div');
        fecha.className = 'course-date';
        const turnoLabel = session.turno ? (` - ${session.turno}`) : '';
        fecha.textContent = `${formatDate(session.fecha)}${turnoLabel}`;
        courseHeader.appendChild(title);
        courseHeader.appendChild(fecha);

        const inner = document.createElement('div');
        inner.className = 'historial-inner-box';

        session.alumnos.forEach(a => {
            const row = document.createElement('div');
            row.className = 'historial-row inner-row';
            const name = document.createElement('div');
            name.className = 'hist-cell name';
            name.textContent = `${a.apellidos}, ${a.nombres}`;
            const estado = document.createElement('div');
            estado.className = 'hist-cell estado';
            estado.textContent = a.estado || '';
            row.appendChild(name);
            row.appendChild(estado);
            inner.appendChild(row);
        });

        card.appendChild(courseHeader);
        card.appendChild(inner);
        return card;
    }

    async function loadHistorial() {
        container.innerHTML = '<div class="loading">Cargando historial...</div>';
        try {
            // construir query según filtros
            const params = new URLSearchParams();
            if (anioSelect && anioSelect.value) params.append('anio', anioSelect.value);
            if (divisionSelect && divisionSelect.value) params.append('division', divisionSelect.value);
            if (fechaInput && fechaInput.value) params.append('fecha', fechaInput.value);
            if (turnoSelect && turnoSelect.value) params.append('turno', turnoSelect.value);

            const url = '/api/historial' + (params.toString() ? `?${params.toString()}` : '');
            const res = await fetch(url);
            if (!res.ok) throw new Error('Error fetching historial');
            const sessions = await res.json();

            container.innerHTML = '';
            if (!sessions || sessions.length === 0) {
                container.innerHTML = '<div class="empty">No hay registros de asistencias aún.</div>';
                return;
            }

            sessions.forEach(s => {
                const card = createCard(s);
                container.appendChild(card);
            });
        } catch (err) {
            console.error(err);
            container.innerHTML = '<div class="error">Error al cargar historial.</div>';
        }
    }

    // Cargar al inicio
    document.addEventListener('DOMContentLoaded', async () => {
        // poblar selects de filtros (usando /api/cursos)
        try {
            const r = await fetch('/api/cursos');
            if (r.ok) {
                const cursos = await r.json();
                const anios = Array.from(new Set(cursos.map(c => String(c.anio))));
                const divisiones = Array.from(new Set(cursos.map(c => String(c.division))));
                if (anioSelect) {
                    anios.forEach(a => {
                        const opt = document.createElement('option');
                        opt.value = a; opt.textContent = a;
                        anioSelect.appendChild(opt);
                    });
                }
                if (divisionSelect) {
                    divisiones.forEach(d => {
                        const opt = document.createElement('option');
                        opt.value = d; opt.textContent = d;
                        divisionSelect.appendChild(opt);
                    });
                }
            }
        } catch (e) {
            console.error('No se pudieron cargar cursos para filtros', e);
        }

        loadHistorial();
    });

    // Recargar cuando se guarden asistencias
    document.addEventListener('asistenciasSaved', (e) => {
        loadHistorial();
    });

    // Filtrar al presionar botones
    if (filterBtn) filterBtn.addEventListener('click', () => loadHistorial());
    if (clearBtn) clearBtn.addEventListener('click', () => {
        if (anioSelect) anioSelect.value = '';
        if (divisionSelect) divisionSelect.value = '';
        if (fechaInput) fechaInput.value = '';
        if (turnoSelect) turnoSelect.value = ''; // seleccionar 'Todos' en Turno
        loadHistorial();
    });

    // También recargar al mostrar la sección historial
    document.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.nav-item');
        if (!btn) return;
        const target = btn.getAttribute('data-section');
        if (target === 'historial') loadHistorial();
    });
})();
