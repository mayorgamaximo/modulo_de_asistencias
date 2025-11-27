// Dashboard: reemplazar los datos estáticos por datos reales consultando /api/historial
(function () {
    const presentCard = document.querySelector('.card.present h2');
    const absentCard = document.querySelector('.card.absent h2');
    const lateCard = document.querySelector('.card.late h2');

    if (!presentCard || !absentCard || !lateCard) return;

    function getTodayISO() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    async function loadDashboard() {
        // reset to 0 while loading
        presentCard.textContent = '0';
        absentCard.textContent = '0';
        lateCard.textContent = '0';

        const fecha = getTodayISO();
        try {
            const res = await fetch(`/api/historial?fecha=${encodeURIComponent(fecha)}`);
            if (!res.ok) throw new Error('Error fetching historial para dashboard');
            const sessions = await res.json();

            let present = 0, absent = 0, late = 0;
            // sumar alumno por estado
            sessions.forEach(sess => {
                (sess.alumnos || []).forEach(a => {
                    const estado = String(a.estado || '').trim().toLowerCase();
                    if (estado === 'presente') present++;
                    else if (estado === 'ausente') absent++;
                    else if (estado === 'tarde' || estado === 'tardanza' || estado === 'llegada tarde') late++;
                });
            });

            presentCard.textContent = String(present);
            absentCard.textContent = String(absent);
            lateCard.textContent = String(late);
        } catch (err) {
            console.error('Error al cargar dashboard:', err);
            // deja los valores en 0 si ocurre un error
        }
    }

    // carga inicial
    document.addEventListener('DOMContentLoaded', () => {
        loadDashboard();
        loadCursos();
    });

    // recargar cuando se guarden asistencias
    document.addEventListener('asistenciasSaved', loadDashboard);

    // recargar al mostrar la sección dashboard
    document.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.nav-item');
        if (!btn) return;
        const target = btn.getAttribute('data-section');
        if (target === 'dashboard') loadDashboard();
    });
    
    // ---- Cargar cursos dinámicos para la sección 'Cursos' del dashboard ----
    const courseGrid = document.querySelector('.course-grid');
    async function fetchCursos() {
        try {
            const r = await fetch('/api/cursos');
            if (!r.ok) throw new Error('Error al obtener cursos');
            return await r.json();
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    async function fetchLista(id_curso) {
        try {
            const r = await fetch(`/api/lista?id_curso=${encodeURIComponent(id_curso)}`);
            if (!r.ok) throw new Error('Error al obtener lista');
            return await r.json();
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    async function loadCursos() {
        if (!courseGrid) return;
        courseGrid.innerHTML = '<div class="loading">Cargando cursos...</div>';
        try {
            const cursos = await fetchCursos();
            courseGrid.innerHTML = '';
            // paralelizar requests de listas por curso para mayor velocidad
            const promises = cursos.map(async c => {
                const students = await fetchLista(c.id);
                const count = (students || []).length;
                return { curso: c, count };
            });
            const results = await Promise.all(promises);
            results.forEach(({ curso: c, count }) => {
                const card = document.createElement('div');
                card.className = 'course-card';
                card.innerHTML = `${c.anio}° Año - División ${c.division} <span>${count} estudiantes</span><i class=\"fa-solid fa-users\"></i>`;
                courseGrid.appendChild(card);
            });
            if (!cursos || cursos.length === 0) {
                courseGrid.innerHTML = '<div class="empty">No hay cursos registrados.</div>';
            }
        } catch (err) {
            console.error(err);
            courseGrid.innerHTML = '<div class="error">Error al cargar cursos.</div>';
        }
    }
})();
